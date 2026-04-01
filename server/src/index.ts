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
