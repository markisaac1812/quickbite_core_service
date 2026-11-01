import {randomUUID} from "crypto";
import Redis from "ioredis";
import {cacheProvider} from "../../../src/lib/cache/init";
import {env} from "../../../src/lib/config/env";

/**
 * The service's Redis has no dedicated test DB, so every key lives under a
 * per-run prefix and is deleted afterwards — dev keys are never touched.
 */
const PREFIX = `core-services:test:${randomUUID()}:`;
const key = (name: string) => `${PREFIX}${name}`;

describe("RedisCacheProvider (real Redis)", () => {
    // Side-channel client for asserting TTLs; the provider keeps its client private.
    const inspector = new Redis({host: env.redis.host, port: env.redis.port, password: env.redis.password || undefined});

    afterAll(async () => {
        const leftovers = await inspector.keys(`${PREFIX}*`);
        if (leftovers.length) await inspector.del(...leftovers);
        await inspector.quit();
        await (cacheProvider as unknown as {client: Redis}).client.quit();
    });

    it("sets and reads a value without a TTL", async () => {
        // Arrange
        await cacheProvider.set(key("plain"), "v1");

        // Act
        const value = await cacheProvider.get(key("plain"));

        // Assert
        expect(value).toBe("v1");
        expect(await inspector.ttl(key("plain"))).toBe(-1);
    });

    it("applies the TTL when one is given", async () => {
        // Arrange
        await cacheProvider.set(key("expiring"), JSON.stringify({data: [1]}), 60);

        // Act
        const ttl = await inspector.ttl(key("expiring"));

        // Assert
        expect(ttl).toBeGreaterThan(55);
        expect(JSON.parse(await cacheProvider.get(key("expiring")))).toEqual({data: [1]});
    });

    it("returns null for a missing key and deletes idempotently", async () => {
        // Arrange
        await cacheProvider.set(key("doomed"), "x");

        // Act
        const deleted = [await cacheProvider.del(key("doomed")), await cacheProvider.del(key("doomed"))];

        // Assert
        expect(deleted).toEqual([1, 0]);
        expect(await cacheProvider.get(key("doomed"))).toBeNull();
    });
});
