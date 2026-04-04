import { Router, Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { getEtoroService } from "../services/etoro.js";
import { enrichPositions, enrichTags } from "../services/enrichment.js";
import { setCache, buildCacheKey, tryCacheResponse } from "../services/cache.js";
import { db } from "../db/index.js";
import { portfolioSnapshots, positionTags } from "../db/schema.js";
import type { PortfolioOverview, GroupedPosition } from "@portfolio-tracker/shared";

const router = Router();

router.use(authMiddleware);

router.get("/overview", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const tagId = req.query.tag as string | undefined;
  const cacheKey = buildCacheKey(userId, tagId ? `overview:${tagId}` : "overview");

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const { overview, positions, rawCredit } = await etoro.getPortfolioPnl();

    // Enrich positions BEFORE saving snapshot so DB has names
    await enrichPositions(positions, etoro);

    // Save snapshot to DB (now with enriched names)
    await db.insert(portfolioSnapshots).values({
      userId,
      totalValue: String(overview.totalValue),
      equity: String(overview.equity),
      availableCash: String(rawCredit),
      unrealizedPnl: String(overview.unrealizedPnl),
      positionsJson: positions,
      fetchedAt: new Date(),
    });

    // If tag filter, recalculate overview for only tagged positions
    if (tagId) {
      const taggedRows = await db
        .select()
        .from(positionTags)
        .where(and(eq(positionTags.tagId, tagId), eq(positionTags.userId, userId)));

      const taggedIds = new Set(taggedRows.map((r) => r.etoroPositionId));
      const filtered = positions.filter((p) => taggedIds.has(p.id));

      const totalInvested = filtered.reduce((s, p) => s + p.amount, 0);
      const totalPnl = filtered.reduce((s, p) => s + p.unrealizedPnl, 0);
      const totalValue = totalInvested + totalPnl;

      const taggedOverview: PortfolioOverview = {
        totalValue,
        equity: totalValue,
        availableCash: overview.availableCash,
        unrealizedPnl: totalPnl,
        unrealizedPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
        dailyChange: 0,
        dailyChangePercent: 0,
      };

      setCache(cacheKey, taggedOverview, 60);
      res.json({ success: true, data: taggedOverview });
      return;
    }

    setCache(cacheKey, overview, 60);
    res.json({ success: true, data: overview });
  } catch (err) {
    // Fallback to last snapshot
    const [snapshot] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.fetchedAt))
      .limit(1);

    if (snapshot) {
      const fallback = {
        totalValue: Number(snapshot.totalValue),
        equity: Number(snapshot.equity),
        availableCash: Number(snapshot.availableCash),
        unrealizedPnl: Number(snapshot.unrealizedPnl),
        unrealizedPnlPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
      };
      res.json({ success: true, data: fallback, cached: true });
      return;
    }

    console.warn("eToro API unavailable and no snapshots exist, returning empty overview");
    res.json({
      success: true,
      data: {
        totalValue: 0,
        equity: 0,
        availableCash: 0,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
      },
      cached: true,
      empty: true,
    });
  }
});

router.get("/positions", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const cacheKey = buildCacheKey(userId, "positions");

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const { positions } = await etoro.getPortfolioPnl();

    await enrichPositions(positions, etoro);
    await enrichTags(positions, userId);

    setCache(cacheKey, positions, 60);
    res.json({ success: true, data: positions });
  } catch (err) {
    // Fallback to last snapshot
    const [snapshot] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.fetchedAt))
      .limit(1);

    if (snapshot) {
      res.json({ success: true, data: snapshot.positionsJson, cached: true });
      return;
    }

    console.warn("eToro API unavailable and no snapshots exist, returning empty positions");
    res.json({ success: true, data: [], cached: true, empty: true });
  }
});

router.get("/positions/grouped", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const cacheKey = buildCacheKey(userId, "positions:grouped");

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const { positions } = await etoro.getPortfolioPnl();

    await enrichPositions(positions, etoro);
    await enrichTags(positions, userId);

    // Group by instrumentId
    const groups = new Map<string, typeof positions>();
    for (const pos of positions) {
      const group = groups.get(pos.instrumentId) || [];
      group.push(pos);
      groups.set(pos.instrumentId, group);
    }

    const grouped: GroupedPosition[] = Array.from(groups.values()).map((group) => {
      const first = group[0];
      const totalAmount = group.reduce((s, p) => s + p.amount, 0);
      const totalPnl = group.reduce((s, p) => s + p.unrealizedPnl, 0);
      const totalUnits = group.reduce((s, p) => s + p.units, 0);
      const totalAllocation = group.reduce((s, p) => s + p.allocationPercent, 0);
      const avgOpenRate =
        totalAmount > 0
          ? group.reduce((s, p) => s + p.openRate * p.amount, 0) / totalAmount
          : 0;

      // Collect unique tags across all positions in the group
      const tagMap = new Map<string, { id: string; name: string; color: string | null }>();
      for (const pos of group) {
        for (const tag of pos.tags || []) {
          tagMap.set(tag.id, tag);
        }
      }

      return {
        instrumentId: first.instrumentId,
        instrumentName: first.instrumentName,
        ticker: first.ticker,
        totalAmount,
        totalUnits,
        averageOpenRate: avgOpenRate,
        currentRate: first.currentRate,
        unrealizedPnl: totalPnl,
        unrealizedPnlPercent: totalAmount > 0 ? (totalPnl / totalAmount) * 100 : 0,
        allocationPercent: totalAllocation,
        positionCount: group.length,
        positions: group,
        tags: Array.from(tagMap.values()),
      };
    });

    setCache(cacheKey, grouped, 60);
    res.json({ success: true, data: grouped });
  } catch (err) {
    console.warn("Failed to fetch grouped positions:", err instanceof Error ? err.message : err);
    res.json({ success: true, data: [], cached: true, empty: true });
  }
});

router.get("/positions/:id", async (req: Request, res: Response) => {
  const positionId = String(req.params.id);

  try {
    const etoro = getEtoroService();
    const { positions } = await etoro.getPortfolioPnl();
    const position = positions.find((p) => p.id === positionId);

    if (!position) {
      res.status(404).json({ success: false, error: "Position not found", statusCode: 404 });
      return;
    }

    await enrichPositions([position], etoro);
    res.json({ success: true, data: position });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch position";
    res.status(502).json({ success: false, error: message, statusCode: 502, empty: true });
  }
});

export default router;
