import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getEtoroService } from "../services/etoro.js";
import { setCache, buildCacheKey, tryCacheResponse } from "../services/cache.js";
import type { CandlePeriod } from "@portfolio-tracker/shared";

const router = Router();

router.use(authMiddleware);

router.get("/instruments", async (req: Request, res: Response) => {
  const query = req.query.query ? String(req.query.query) : undefined;
  const cacheKey = buildCacheKey("global", `instruments:${query || "all"}`);

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const instruments = query
      ? await etoro.searchInstruments(query)
      : await etoro.getInstruments();

    setCache(cacheKey, instruments, 300);
    res.json({ success: true, data: instruments });
  } catch (err) {
    console.warn("eToro API unavailable for instruments:", err instanceof Error ? err.message : err);
    res.json({ success: true, data: [], cached: true, empty: true });
  }
});

router.get("/rates", async (req: Request, res: Response) => {
  const instrumentIdsParam = req.query.instrumentIds ? String(req.query.instrumentIds) : "";
  const instrumentIds = instrumentIdsParam.split(",").filter(Boolean);

  if (instrumentIds.length === 0) {
    res.status(400).json({
      success: false,
      error: "instrumentIds query parameter is required",
      statusCode: 400,
    });
    return;
  }

  const cacheKey = buildCacheKey("global", `rates:${instrumentIds.sort().join(",")}`);

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const rates = await etoro.getRates(instrumentIds);

    setCache(cacheKey, rates, 30);
    res.json({ success: true, data: rates });
  } catch (err) {
    console.warn("eToro API unavailable for rates:", err instanceof Error ? err.message : err);
    res.json({ success: true, data: [], cached: true, empty: true });
  }
});

router.get("/candles/:instrumentId", async (req: Request, res: Response) => {
  const instrumentId = String(req.params.instrumentId);
  const period = (String(req.query.period || "1M")) as CandlePeriod;
  const cacheKey = buildCacheKey("global", `candles:${instrumentId}:${period}`);

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const candles = await etoro.getCandles(instrumentId, period);

    setCache(cacheKey, candles, 60);
    res.json({ success: true, data: candles });
  } catch (err) {
    console.warn("eToro API unavailable for candles:", err instanceof Error ? err.message : err);
    res.json({ success: true, data: [], cached: true, empty: true });
  }
});

export default router;
