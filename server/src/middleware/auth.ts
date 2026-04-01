import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";
import { decrypt } from "../services/encryption.js";

export interface AuthPayload {
  userId: string;
  sessionId: string;
}

export interface EtoroKeys {
  apiKey: string;
  userKey: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      etoroKeys?: EtoroKeys;
    }
  }
}

/**
 * Verifies JWT only — does not load session or eToro keys.
 * Use for lightweight checks (e.g., logout, profile).
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing authorization token", statusCode: 401 });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token", statusCode: 401 });
  }
}

/**
 * Verifies JWT AND loads eToro API keys from the session.
 * Use for routes that need to call the eToro API.
 */
export async function authWithKeysMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing authorization token", statusCode: 401 });
    return;
  }

  const token = header.slice(7);
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token", statusCode: 401 });
    return;
  }

  req.auth = payload;

  try {
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
      res.status(401).json({ success: false, error: "Session expired", statusCode: 401 });
      return;
    }

    req.etoroKeys = {
      apiKey: decrypt(session.etoroApiKey),
      userKey: decrypt(session.etoroUserKey),
    };

    next();
  } catch {
    res.status(500).json({ success: false, error: "Failed to load session", statusCode: 500 });
  }
}
