import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { EtoroService } from "../services/etoro.js";
import { authMiddleware, AuthPayload } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

function signJwt(userId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign(
    { userId, sessionId: "single-user" } satisfies AuthPayload,
    process.env.JWT_SECRET!,
    { expiresIn }
  );
}

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Password is required", statusCode: 400 });
    return;
  }

  const { password } = parsed.data;

  // Check against app password
  if (password !== process.env.APP_PASSWORD) {
    res.status(401).json({ success: false, error: "Invalid password", statusCode: 401 });
    return;
  }

  try {
    // Validate eToro keys and get user identity
    const etoro = new EtoroService();
    const identity = await etoro.validateKeys();

    // Upsert user
    let profileData = {
      userId: String(identity.gcid),
      username: identity.username || String(identity.gcid),
      displayName: identity.username || String(identity.gcid),
      avatarUrl: null as string | null,
    };

    try {
      profileData = await etoro.getUserProfile(identity.username);
    } catch {
      // Best effort
    }

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

    const token = signJwt(user.id);

    res.json({
      success: true,
      data: {
        token,
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
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(500).json({ success: false, error: message, statusCode: 500 });
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
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      ignoreExpiration: true,
    }) as AuthPayload;

    const newToken = signJwt(payload.userId);
    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token", statusCode: 401 });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: "Logged out" } });
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
