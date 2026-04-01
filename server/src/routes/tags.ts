import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { tags, positionTags, portfolioSnapshots } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { desc } from "drizzle-orm";

const router = Router();

router.use(authMiddleware);

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

const tagPositionSchema = z.object({
  etoroPositionId: z.string().min(1),
});

// ── Tag CRUD ──────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, req.auth!.userId))
      .orderBy(tags.name);

    res.json({
      success: true,
      data: userTags.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: t.name,
        color: t.color,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tags", statusCode: 500 });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request: name is required (max 100 chars), color must be #RRGGBB",
      statusCode: 400,
    });
    return;
  }

  try {
    const [tag] = await db
      .insert(tags)
      .values({
        userId: req.auth!.userId,
        name: parsed.data.name,
        color: parsed.data.color || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        id: tag.id,
        userId: tag.userId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      // Unique constraint violation
      res.status(409).json({
        success: false,
        error: "A tag with this name already exists",
        statusCode: 409,
      });
      return;
    }
    res.status(500).json({ success: false, error: "Failed to create tag", statusCode: 500 });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const tagId = String(req.params.id);
  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request: name max 100 chars, color must be #RRGGBB or null",
      statusCode: 400,
    });
    return;
  }

  try {
    // Verify ownership
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, req.auth!.userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, error: "Tag not found", statusCode: 404 });
      return;
    }

    const updates: Record<string, any> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.color !== undefined) updates.color = parsed.data.color;

    if (Object.keys(updates).length === 0) {
      res.json({
        success: true,
        data: {
          id: existing.id,
          userId: existing.userId,
          name: existing.name,
          color: existing.color,
          createdAt: existing.createdAt.toISOString(),
        },
      });
      return;
    }

    const [updated] = await db
      .update(tags)
      .set(updates)
      .where(eq(tags.id, tagId))
      .returning();

    res.json({
      success: true,
      data: {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        color: updated.color,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({
        success: false,
        error: "A tag with this name already exists",
        statusCode: 409,
      });
      return;
    }
    res.status(500).json({ success: false, error: "Failed to update tag", statusCode: 500 });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const tagId = String(req.params.id);

  try {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, req.auth!.userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, error: "Tag not found", statusCode: 404 });
      return;
    }

    // Cascade delete handles position_tags cleanup
    await db.delete(tags).where(eq(tags.id, tagId));

    res.json({ success: true, data: { message: "Tag deleted" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete tag", statusCode: 500 });
  }
});

// ── Position Tagging ──────────────────────────

router.get("/:id/positions", async (req: Request, res: Response) => {
  const tagId = String(req.params.id);
  const userId = req.auth!.userId;

  try {
    // Verify tag ownership
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1);

    if (!tag) {
      res.status(404).json({ success: false, error: "Tag not found", statusCode: 404 });
      return;
    }

    // Get all position IDs for this tag
    const taggedPositions = await db
      .select()
      .from(positionTags)
      .where(and(eq(positionTags.tagId, tagId), eq(positionTags.userId, userId)));

    const positionIds = taggedPositions.map((pt) => pt.etoroPositionId);

    if (positionIds.length === 0) {
      res.json({
        success: true,
        data: {
          tag: { id: tag.id, name: tag.name, color: tag.color },
          positions: [],
          analytics: {
            positionCount: 0,
            totalValue: 0,
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
          },
        },
      });
      return;
    }

    // Get latest portfolio snapshot for position data
    const [snapshot] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.fetchedAt))
      .limit(1);

    let matchedPositions: any[] = [];
    if (snapshot && Array.isArray(snapshot.positionsJson)) {
      matchedPositions = (snapshot.positionsJson as any[]).filter((p: any) =>
        positionIds.includes(String(p.id))
      );
    }

    // Calculate aggregated analytics
    const totalValue = matchedPositions.reduce(
      (sum, p) => sum + (p.amount || 0) + (p.unrealizedPnl || 0),
      0
    );
    const totalInvested = matchedPositions.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPnl = matchedPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    res.json({
      success: true,
      data: {
        tag: { id: tag.id, name: tag.name, color: tag.color },
        positions: matchedPositions,
        analytics: {
          positionCount: matchedPositions.length,
          totalValue,
          unrealizedPnl: totalPnl,
          unrealizedPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch tagged positions", statusCode: 500 });
  }
});

router.post("/:id/positions", async (req: Request, res: Response) => {
  const tagId = String(req.params.id);
  const userId = req.auth!.userId;

  const parsed = tagPositionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request: etoroPositionId is required",
      statusCode: 400,
    });
    return;
  }

  try {
    // Verify tag ownership
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1);

    if (!tag) {
      res.status(404).json({ success: false, error: "Tag not found", statusCode: 404 });
      return;
    }

    const [positionTag] = await db
      .insert(positionTags)
      .values({
        userId,
        etoroPositionId: parsed.data.etoroPositionId,
        tagId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        id: positionTag.id,
        userId: positionTag.userId,
        etoroPositionId: positionTag.etoroPositionId,
        tagId: positionTag.tagId,
        createdAt: positionTag.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({
        success: false,
        error: "This position is already tagged",
        statusCode: 409,
      });
      return;
    }
    res.status(500).json({ success: false, error: "Failed to tag position", statusCode: 500 });
  }
});

router.delete("/:id/positions/:etoroPositionId", async (req: Request, res: Response) => {
  const tagId = String(req.params.id);
  const etoroPositionId = String(req.params.etoroPositionId);
  const userId = req.auth!.userId;

  try {
    const [existing] = await db
      .select()
      .from(positionTags)
      .where(
        and(
          eq(positionTags.tagId, tagId),
          eq(positionTags.etoroPositionId, etoroPositionId),
          eq(positionTags.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, error: "Position tag not found", statusCode: 404 });
      return;
    }

    await db.delete(positionTags).where(eq(positionTags.id, existing.id));

    res.json({ success: true, data: { message: "Tag removed from position" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to remove tag", statusCode: 500 });
  }
});

export default router;
