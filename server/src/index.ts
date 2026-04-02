import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import portfolioRoutes from "./routes/portfolio.js";
import historyRoutes from "./routes/history.js";
import marketRoutes from "./routes/market.js";
import tagRoutes from "./routes/tags.js";

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000"],
}));
app.use(express.json());

// Request/Response logger
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const timestamp = new Date().toISOString();

  // Redact sensitive fields from request body
  const sanitizeBody = (body: any) => {
    if (!body || typeof body !== "object") return body;
    const copy = { ...body };
    if (copy.password) copy.password = "[REDACTED]";
    if (copy.token) copy.token = "[REDACTED]";
    return copy;
  };

  const reqBody = Object.keys(req.body || {}).length > 0 ? sanitizeBody(req.body) : undefined;

  console.log(
    `[REQ] ${timestamp} ${method} ${originalUrl}` +
    (reqBody ? ` body=${JSON.stringify(reqBody)}` : "") +
    (req.headers.authorization ? ` auth=Bearer ...${req.headers.authorization.slice(-8)}` : "")
  );

  // Capture response body by intercepting res.json
  const originalJson = res.json.bind(res);
  let responseBody: any;
  res.json = (body: any) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";

    // Truncate large response bodies (e.g. positions arrays)
    let bodyLog = "";
    if (responseBody) {
      const str = JSON.stringify(responseBody);
      bodyLog = str.length > 500 ? ` body=${str.slice(0, 500)}...` : ` body=${str}`;
    }

    console.log(
      `[${level}] ${new Date().toISOString()} ${method} ${originalUrl} → ${statusCode} (${duration}ms)${bodyLog}`
    );
  });

  next();
});

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // generous for single-user mode
  message: { success: false, error: "Too many requests, please try again later", statusCode: 429 },
});
app.use("/api/auth", authLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/tags", tagRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found", statusCode: 404 });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, error: "Internal server error", statusCode: 500 });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
