import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";
import { encrypt } from "../services/encryption.js";
import { EtoroService } from "../services/etoro.js";
import { authMiddleware, AuthPayload } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  userKey: z.string().min(1, "User key is required"),
});

function signJwt(userId: string, sessionId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"];
  return jwt.sign(
    { userId, sessionId } satisfies AuthPayload,
    process.env.JWT_SECRET!,
    { expiresIn }
  );
}

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Invalid request: apiKey and userKey are required",
      statusCode: 400,
    });
    return;
  }

  const { apiKey, userKey } = parsed.data;

  try {
    // Validate keys by fetching user identity from eToro
    const etoro = new EtoroService(apiKey, userKey);
    const identity = await etoro.validateKeys();

    // Try to get profile info
    let profileData = {
      userId: String(identity.gcid),
      username: identity.username || String(identity.gcid),
      displayName: identity.username || String(identity.gcid),
      avatarUrl: null as string | null,
    };

    try {
      profileData = await etoro.getUserProfile(identity.username);
    } catch {
      // Profile fetch is best-effort; identity is sufficient
    }

    // Upsert user
    const [user] = await db
      .insert(users)
      .values({
        etoroUserId: profileData.userId,
        username: profileData.username,
        displayName: profileData.displayName,
        avatarUrl: profileData.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.etoroUserId,
        set: {
          username: profileData.username,
          displayName: profileData.displayName,
          avatarUrl: profileData.avatarUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Create session with encrypted eToro keys
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30); // 30-day session (keys don't expire)

    const tempToken = signJwt(user.id, "pending");

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        jwtToken: tempToken,
        etoroApiKey: encrypt(apiKey),
        etoroUserKey: encrypt(userKey),
        expiresAt: sessionExpiry,
      })
      .returning();

    // Re-sign JWT with actual session ID
    const finalToken = signJwt(user.id, session.id);

    await db
      .update(sessions)
      .set({ jwtToken: finalToken })
      .where(eq(sessions.id, session.id));

    res.json({
      success: true,
      data: {
        token: finalToken,
        user: {
          id: user.id,
          etoroUserId: user.etoroUserId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    const status = message.includes("401") ? 401 : 500;
    res.status(status).json({ success: false, error: "Invalid eToro API keys", statusCode: status });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing token", statusCode: 401 });
    return;
  }

  const token = header.slice(7);

  try {
    // Verify signature but ignore expiration
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      ignoreExpiration: true,
    }) as AuthPayload;

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, payload.sessionId))
      .limit(1);

    if (!session) {
      res.status(401).json({ success: false, error: "Session not found", statusCode: 401 });
      return;
    }

    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      res.status(401).json({ success: false, error: "Session expired, please login again", statusCode: 401 });
      return;
    }

    const newToken = signJwt(payload.userId, session.id);

    await db
      .update(sessions)
      .set({ jwtToken: newToken })
      .where(eq(sessions.id, session.id));

    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token", statusCode: 401 });
  }
});

router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    await db.delete(sessions).where(eq(sessions.id, req.auth!.sessionId));
    res.json({ success: true, data: { message: "Logged out" } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to logout", statusCode: 500 });
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.auth!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ success: false, error: "User not found", statusCode: 404 });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        etoroUserId: user.etoroUserId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user", statusCode: 500 });
  }
});

export default router;
