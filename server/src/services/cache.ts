import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
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
