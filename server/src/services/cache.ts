import NodeCache from "node-cache";
import type { Instrument } from "@portfolio-tracker/shared";

const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
});

// Long-lived cache for instrument metadata (names/tickers don't change often)
const instrumentCache = new NodeCache({
  stdTTL: 86400, // 24 hours
  checkperiod: 3600,
});

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttlSeconds?: number): void {
  if (ttlSeconds) {
    cache.set(key, value, ttlSeconds);
  } else {
    cache.set(key, value);
  }
}

export function invalidateCache(key: string): void {
  cache.del(key);
}

export function buildCacheKey(userId: string, resource: string): string {
  return `${userId}:${resource}`;
}

/**
 * Try to serve a cached response. Returns true if cache hit (response sent).
 */
export function tryCacheResponse(
  req: { query: { refresh?: string } },
  res: { json: (body: any) => void },
  cacheKey: string
): boolean {
  if (!req.query.refresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return true;
    }
  }
  return false;
}

// --- Instrument cache (24h TTL) ---

export function getCachedInstruments(): Instrument[] | undefined {
  return instrumentCache.get<Instrument[]>("instruments:all");
}

export function setCachedInstruments(instruments: Instrument[]): void {
  instrumentCache.set("instruments:all", instruments);
}
