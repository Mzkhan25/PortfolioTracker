import { Router, Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { authWithKeysMiddleware } from "../middleware/auth.js";
import { EtoroService } from "../services/etoro.js";
import { getCached, setCache, buildCacheKey } from "../services/cache.js";
import { db } from "../db/index.js";
import { portfolioSnapshots, positionTags } from "../db/schema.js";
import type { PortfolioOverview, Position } from "@portfolio-tracker/shared";

const router = Router();

router.use(authWithKeysMiddleware);

router.get("/overview", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const tagId = req.query.tag as string | undefined;
  const cacheKey = buildCacheKey(userId, tagId ? `overview:${tagId}` : "overview");

  if (!req.query.refresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
  }

  try {
    const etoro = new EtoroService(req.etoroKeys!.apiKey, req.etoroKeys!.userKey);
    const { overview, positions, rawCredit } = await etoro.getPortfolioPnl();

    // Save snapshot to DB
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

    const message = err instanceof Error ? err.message : "Failed to fetch portfolio";
    res.status(502).json({ success: false, error: message, statusCode: 502 });
  }
});

router.get("/positions", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const cacheKey = buildCacheKey(userId, "positions");

  if (!req.query.refresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
  }

  try {
    const etoro = new EtoroService(req.etoroKeys!.apiKey, req.etoroKeys!.userKey);
    const { positions } = await etoro.getPortfolioPnl();

    // Enrich with instrument names
    const instrumentIds = [...new Set(positions.map((p) => p.instrumentId))];
    if (instrumentIds.length > 0) {
      try {
        const rates = await etoro.getRates(instrumentIds);
        const instruments = await etoro.getInstruments();
        const instrumentMap = new Map(instruments.map((i) => [i.instrumentId, i]));

        for (const pos of positions) {
          const instrument = instrumentMap.get(pos.instrumentId);
          if (instrument) {
            pos.instrumentName = instrument.name;
            pos.ticker = instrument.ticker;
          }
          const rate = rates.find((r) => r.instrumentId === pos.instrumentId);
          if (rate) {
            pos.currentRate = rate.lastPrice;
          }
        }
      } catch {
        // Best effort — positions still returned without names
      }
    }

    // Enrich with tags
    const allPositionTags = await db
      .select()
      .from(positionTags)
      .where(eq(positionTags.userId, userId));

    if (allPositionTags.length > 0) {
      // Load tag details
      const { tags: tagsTable } = await import("../db/schema.js");
      const userTags = await db
        .select()
        .from(tagsTable)
        .where(eq(tagsTable.userId, userId));
      const tagMap = new Map(userTags.map((t) => [t.id, { id: t.id, name: t.name, color: t.color }]));

      for (const pos of positions) {
        const ptags = allPositionTags
          .filter((pt) => pt.etoroPositionId === pos.id)
          .map((pt) => tagMap.get(pt.tagId))
          .filter(Boolean) as { id: string; name: string; color: string | null }[];
        pos.tags = ptags;
      }
    }

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

    const message = err instanceof Error ? err.message : "Failed to fetch positions";
    res.status(502).json({ success: false, error: message, statusCode: 502 });
  }
});

router.get("/positions/:id", async (req: Request, res: Response) => {
  const positionId = String(req.params.id);

  try {
    const etoro = new EtoroService(req.etoroKeys!.apiKey, req.etoroKeys!.userKey);
    const { positions } = await etoro.getPortfolioPnl();
    const position = positions.find((p) => p.id === positionId);

    if (!position) {
      res.status(404).json({ success: false, error: "Position not found", statusCode: 404 });
      return;
    }

    res.json({ success: true, data: position });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch position";
    res.status(502).json({ success: false, error: message, statusCode: 502 });
  }
});

export default router;
