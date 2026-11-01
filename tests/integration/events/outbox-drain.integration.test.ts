import "reflect-metadata";
import {randomUUID} from "crypto";
import {truncateAll} from "../../helpers/db";
import {AmqpProbe} from "../../helpers/amqp";
import {waitFor} from "../../helpers/wait";
import {db} from "../../../src/lib/knex/knex";
import {env} from "../../../src/lib/config/env";
import {messageBroker} from "../../../src/lib/events/init";
import {drainOutbox} from "../../../src/lib/events/outbox-drain";
import * as outboxRepo from "../../../src/lib/events/outbox.repo";
import {EVENT_TYPES} from "../../../src/lib/events/event-types";

async function outboxRows() {
    return db("events_outbox").select("event_type", "dispatched_at", "attempts", "last_error").orderBy("id", "asc");
}

describe("drainOutbox (real RabbitMQ)", () => {
    let probe: AmqpProbe;
    let queue: string;

    beforeAll(async () => {
        probe = await AmqpProbe.open();
        queue = await probe.bindCatchAllQueue(env.rabbit.exchange, `core-services.outbox-probe.${randomUUID()}`);
        jest.spyOn(console, "log").mockImplementation(() => {}); // logger output
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        await messageBroker.close();
        await probe.close();
        await db.destroy();
    });

    beforeEach(async () => {
        await truncateAll();
        await probe.purge(queue);
        jest.mocked(console.log).mockClear();
    });

    afterEach(() => {
        jest.spyOn(messageBroker, "publishConfirmed").mockRestore();
    });

    it("publishes pending rows in id order as persistent JSON envelopes and marks them dispatched", async () => {
        // Arrange
        await outboxRepo.insertOutboxEvents(db, [
            {aggregateType: "restaurant_branches", aggregateId: 7, eventType: EVENT_TYPES.BRANCH_UPDATED, payload: {branchId: 7}},
            {aggregateType: "restaurants", aggregateId: 3, eventType: EVENT_TYPES.RESTAURANT_SUSPENDED, payload: {restaurantId: 3}},
        ]);

        // Act
        await drainOutbox();

        // Assert
        const first = await waitForMessage(probe, queue);
        const second = await waitForMessage(probe, queue);
        expect(first).toMatchObject({routingKey: "branch.updated", contentType: "application/json", persistent: true});
        expect(first.body).toMatchObject({
            eventId: expect.any(String),
            eventType: "branch.updated",
            occurredAt: expect.any(String),
            aggregateType: "restaurant_branches",
            aggregateId: "7",
            payload: {branchId: 7},
        });
        expect(second.routingKey).toBe("restaurant.suspended");
        const rows = await outboxRows();
        expect(rows.every((r) => r.dispatched_at instanceof Date && r.attempts === 0)).toBe(true);
    });

    it("never republishes a row that was already dispatched", async () => {
        // Arrange
        await outboxRepo.insertOutboxEvent(db, {aggregateType: "restaurants", aggregateId: 1, eventType: EVENT_TYPES.RESTAURANT_SUSPENDED, payload: {}});
        await drainOutbox();
        await waitForMessage(probe, queue);

        // Act
        await drainOutbox();

        // Assert
        await new Promise((r) => setTimeout(r, 200));
        expect(await probe.pop(queue)).toBeNull();
    });

    it("is a no-op on an empty outbox", async () => {
        // Arrange
        const publish = jest.spyOn(messageBroker, "publishConfirmed");

        // Act
        await drainOutbox();

        // Assert
        expect(publish).not.toHaveBeenCalled();
    });

    it("marks a failed publish, records the error and stops the batch", async () => {
        // Arrange
        await outboxRepo.insertOutboxEvents(db, [
            {aggregateType: "a", aggregateId: 1, eventType: EVENT_TYPES.BRANCH_UPDATED, payload: {}},
            {aggregateType: "a", aggregateId: 2, eventType: EVENT_TYPES.BRANCH_UPDATED, payload: {}},
        ]);
        jest.spyOn(messageBroker, "publishConfirmed").mockRejectedValueOnce(new Error("channel closed: NOT_FOUND"));

        // Act
        await drainOutbox();

        // Assert
        expect(await outboxRows()).toEqual([
            {event_type: "branch.updated", dispatched_at: null, attempts: 1, last_error: "channel closed: NOT_FOUND"},
            {event_type: "branch.updated", dispatched_at: null, attempts: 0, last_error: null},
        ]);
        const logged = jest.mocked(console.log).mock.calls.map(([line]) => JSON.parse(line as string));
        expect(logged).toContainEqual(expect.objectContaining({level: "error", message: "outbox publish failed"}));
    });

    it("retries a failed row on the next pass", async () => {
        // Arrange
        await outboxRepo.insertOutboxEvent(db, {aggregateType: "a", aggregateId: 1, eventType: EVENT_TYPES.BRANCH_DEACTIVATED, payload: {}});
        jest.spyOn(messageBroker, "publishConfirmed").mockRejectedValueOnce(new Error("timeout"));
        await drainOutbox();

        // Act
        await drainOutbox();

        // Assert
        const [row] = await outboxRows();
        expect(row.attempts).toBe(1);
        expect(row.dispatched_at).toBeInstanceOf(Date);
        expect((await waitForMessage(probe, queue)).routingKey).toBe("branch.deactivated");
    });

    it.each([
        ["an AggregateError-like object", {errors: [new Error("ECONNREFUSED 127.0.0.1:5672"), new Error("ECONNREFUSED ::1:5672")]}, "ECONNREFUSED 127.0.0.1:5672; ECONNREFUSED ::1:5672"],
        ["a plain object", {code: 320, reason: "CONNECTION_FORCED"}, '{"code":320,"reason":"CONNECTION_FORCED"}'],
        ["an unserialisable object", (() => {
            const circular: Record<string, unknown> = {};
            circular.self = circular;
            return circular;
        })(), "[object Object]"],
    ])("records a readable last_error for %s", async (_label, rejection, expected) => {
        // Arrange
        await outboxRepo.insertOutboxEvent(db, {aggregateType: "a", aggregateId: 1, eventType: EVENT_TYPES.BRANCH_UPDATED, payload: {}});
        jest.spyOn(messageBroker, "publishConfirmed").mockRejectedValueOnce(rejection);

        // Act
        await drainOutbox();

        // Assert
        const [row] = await outboxRows();
        expect(row.last_error).toBe(expected);
    });

    it("rolls back and rethrows when the batch cannot be claimed", async () => {
        // Arrange
        await outboxRepo.insertOutboxEvent(db, {aggregateType: "a", aggregateId: 1, eventType: EVENT_TYPES.BRANCH_UPDATED, payload: {}});
        const claim = jest.spyOn(outboxRepo, "claimBatch").mockRejectedValueOnce(new Error("lock timeout"));

        // Act
        const act = drainOutbox();

        // Assert
        await expect(act).rejects.toThrow("lock timeout");
        claim.mockRestore();
        const [row] = await outboxRows();
        expect(row).toMatchObject({dispatched_at: null, attempts: 0});
    });
});

async function waitForMessage(probe: AmqpProbe, queue: string) {
    let msg: Awaited<ReturnType<AmqpProbe["pop"]>> = null;
    await waitFor(async () => {
        msg = await probe.pop(queue);
        return msg !== null;
    });
    return msg!;
}
