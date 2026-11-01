import {ICacheProvider} from "../../src/pkg/cache/cache.interface";

/**
 * In-memory stand-in for the Redis cache provider. The dev Redis has no
 * per-test DB, so HTTP integration tests swap `lib/cache/init` for this stub
 * (same pattern as EmailStub) — cached responses and idempotency replays then
 * never leak between tests or into dev keys. RedisCacheProvider itself is
 * covered against real Redis in tests/integration/pkg.
 */
export class CacheStub implements ICacheProvider {
  store = new Map<string, {value: string; ttlSeconds?: number}>();
  /** When set, every call rejects with this error (simulates Redis being down). */
  failWith: Error | null = null;

  async get(key: string): Promise<string | null> {
    if (this.failWith) throw this.failWith;
    return this.store.get(key)?.value ?? null;
  }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.store.set(key, {value, ttlSeconds});
  }
  async del(key: string): Promise<number> {
    if (this.failWith) throw this.failWith;
    return this.store.delete(key) ? 1 : 0;
  }
  reset(): void {
    this.store.clear();
    this.failWith = null;
  }
}

export const cacheStub = new CacheStub();
