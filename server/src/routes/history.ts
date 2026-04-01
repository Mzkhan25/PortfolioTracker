import { Router, Request, Response } from "express";
import { authWithKeysMiddleware } from "../middleware/auth.js";
import { EtoroService } from "../services/etoro.js";
import { getCached, setCache, buildCacheKey } from "../services/cache.js";

const router = Router();

router.use(authWithKeysMiddleware);

router.get("/trades", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const page = parseInt(String(req.query.page)) || 1;
  const pageSize = parseInt(String(req.query.limit)) || 20;

  // Default to 1 year ago if no minDate provided
  const minDate =
    req.query.minDate
      ? String(req.query.minDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const cacheKey = buildCacheKey(userId, `trades:${minDate}:${page}:${pageSize}`);

  if (!req.query.refresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
  }

  try {
    const etoro = new EtoroService(req.etoroKeys!.apiKey, req.etoroKeys!.userKey);
    const result = await etoro.getTradeHistory(minDate, page, pageSize);

    // Enrich with instrument names
    const instrumentIds = [...new Set(result.trades.map((t: any) => t.instrumentId))];
    if (instrumentIds.length > 0) {
      try {
        const instruments = await etoro.getInstruments();
        const instrumentMap = new Map(instruments.map((i) => [i.instrumentId, i]));
        for (const trade of result.trades) {
          const instrument = instrumentMap.get(trade.instrumentId);
          if (instrument) {
            trade.instrumentName = instrument.name;
            trade.ticker = instrument.ticker;
          }
        }
      } catch {
        // Best effort enrichment
      }
    }

    const response = {
      items: result.trades,
      total: result.total,
      page,
      limit: pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };

    setCache(cacheKey, response, 120);
    res.json({ success: true, data: response });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch trade history";
    res.status(502).json({ success: false, error: message, statusCode: 502 });
  }
});

router.get("/trades/:id", async (req: Request, res: Response) => {
  const tradeId = String(req.params.id);
  const minDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const etoro = new EtoroService(req.etoroKeys!.apiKey, req.etoroKeys!.userKey);
    const result = await etoro.getTradeHistory(minDate, 1, 100);
    const trade = result.trades.find((t: any) => t.id === tradeId);

    if (!trade) {
      res.status(404).json({ success: false, error: "Trade not found", statusCode: 404 });
      return;
    }

    res.json({ success: true, data: trade });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch trade";
    res.status(502).json({ success: false, error: message, statusCode: 502 });
  }
});

export default router;
