// The real container wires Redis/Mailjet at import time — hand the middleware
// the in-memory stub instead. Resolved lazily: the factory runs before the
// imports below have been evaluated.
jest.mock("../../../src/lib/di/container", () => ({
    container: {resolve: () => require("../../helpers/cache-stub").cacheStub},
}));

import {withCache} from "../../../src/lib/cache/withCache";
import {idempotency} from "../../../src/lib/idempotency/idempotency";
import {cacheStub} from "../../helpers/cache-stub";
import {mockNext, mockRequest, mockResponse} from "../../helpers/http-mocks";

beforeEach(() => {
    cacheStub.reset();
});

describe("withCache", () => {
    it("serves a cached body with X-Cache: HIT without calling the handler", async () => {
        // Arrange
        cacheStub.store.set("GET:/api/branches/nearby?lat=1", {value: JSON.stringify({data: ["cached"]})});
        const res = mockResponse();
        const next = mockNext();

        // Act
        await withCache()(mockRequest({originalUrl: "/api/branches/nearby?lat=1"}), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentHeaders["X-Cache"]).toBe("HIT");
        expect(res.sentBody).toEqual({data: ["cached"]});
    });

    it("stores a 2xx response under method + url with the given TTL", async () => {
        // Arrange
        const res = mockResponse();
        const next = mockNext();
        await withCache(60)(mockRequest({originalUrl: "/api/internal/branches?ids=1"}), res, next);

        // Act — the handler responds
        res.status(200).json({success: true, data: [1]});

        // Assert
        expect(next).toHaveBeenCalled();
        expect(res.sentHeaders["X-Cache"]).toBe("MISS");
        expect(cacheStub.store.get("GET:/api/internal/branches?ids=1")).toEqual({value: JSON.stringify({success: true, data: [1]}), ttlSeconds: 60});
    });

    it("does not cache error responses", async () => {
        // Arrange
        const res = mockResponse();
        await withCache()(mockRequest({originalUrl: "/api/x"}), res, mockNext());

        // Act
        res.status(404).json({error: "nope"});

        // Assert
        expect(cacheStub.store.size).toBe(0);
        expect(res.sentBody).toEqual({error: "nope"});
    });

    it("scopes the key per user when asked", async () => {
        // Arrange
        const res = mockResponse();
        await withCache(10, true)(mockRequest({originalUrl: "/api/me", user: {userId: 42, email: "a@b.c", role: "customer"}}), res, mockNext());

        // Act
        res.json({id: 42});

        // Assert
        expect([...cacheStub.store.keys()]).toEqual(["GET:/api/me:42"]);
    });

    it("forwards a cache failure to the error handler", async () => {
        // Arrange
        cacheStub.failWith = new Error("redis down");
        const next = mockNext();

        // Act
        await withCache()(mockRequest(), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledWith(cacheStub.failWith);
    });
});

describe("idempotency", () => {
    const post = (key?: string) =>
        mockRequest({method: "POST", originalUrl: "/api/auth/forget-password", headers: key ? {"idempotency-key": key} : {}});

    it("ignores safe methods", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await idempotency({strict: true})(mockRequest({method: "GET"}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });

    it("requires the header in strict mode", async () => {
        // Arrange
        const res = mockResponse();
        const next = mockNext();

        // Act
        await idempotency({strict: true})(post(), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentStatus).toBe(400);
        expect(res.sentBody).toEqual({error: "Missing Idempotency-Key header"});
    });

    it("lets a request without the header through in lenient mode", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await idempotency()(post(), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });

    it("records the first response for a day and replays it for the same key", async () => {
        // Arrange
        const first = mockResponse();
        await idempotency()(post("key-1"), first, mockNext());
        first.status(200).json({success: true, data: {message: "sent"}});
        const replay = mockResponse();
        const next = mockNext();

        // Act
        await idempotency()(post("key-1"), replay, next);

        // Assert
        expect(cacheStub.store.get("idempotency:POST:/api/auth/forget-password:key-1")?.ttlSeconds).toBe(86_400);
        expect(next).not.toHaveBeenCalled();
        expect(replay.sentStatus).toBe(200);
        expect(replay.sentBody).toEqual({success: true, data: {message: "sent"}});
    });

    it("answers 503 in strict mode when the store is unavailable", async () => {
        // Arrange
        cacheStub.failWith = new Error("redis down");
        const res = mockResponse();

        // Act
        await idempotency({strict: true})(post("key-2"), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(503);
        expect(res.sentBody).toEqual({error: "Idempotency service unavailable"});
    });

    it("degrades to pass-through in lenient mode when the store is unavailable", async () => {
        // Arrange
        cacheStub.failWith = new Error("redis down");
        const next = mockNext();

        // Act
        await idempotency()(post("key-3"), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });
});
