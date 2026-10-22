import type {Knex} from "knex";
import {randomUUID} from "crypto";
import {db} from "../knex/knex";
import {OutboxRow, InsertOutboxInput} from "./types";

/**
 * Insert an event in the SAME trx as the domain mutation that produced it.
 * Callers pass their trx (conn). No dispatch happens here — the dispatcher
 * drains this table on its own interval.
 */
export async function insertOutboxEvent(conn: Knex, input: InsertOutboxInput): Promise<void> {
    await conn("events_outbox").insert({
        aggregate_type: input.aggregateType,
        aggregate_id: String(input.aggregateId),
        event_type: input.eventType,
        event_id: randomUUID(),
        payload: JSON.stringify(input.payload),
    });
}

/**
 * Dispatcher claim — selects a batch of undispatched rows and locks them so
 * another dispatcher process won't pick up the same rows. Caller is
 * responsible for committing/rolling back the trx.
 */
export async function claimBatch(conn: Knex, limit: number): Promise<OutboxRow[]> {
    const rows = await conn("events_outbox")
        .select("id", "aggregate_type", "aggregate_id", "event_type", "event_id", "payload", "attempts")
        .whereNull("dispatched_at")
        .orderBy("id", "asc")
        .limit(limit)
        .forUpdate()
        .skipLocked();
    return rows as OutboxRow[];
}

export async function markDispatched(conn: Knex, id: string): Promise<void> {
    await conn("events_outbox").where({id}).update({dispatched_at: new Date()});
}

export async function markFailed(conn: Knex, id: string, err: string): Promise<void> {
    await conn("events_outbox")
        .where({id})
        .update({
            attempts: db.raw("attempts + 1"),
            last_error: err.slice(0, 2000),
        });
}
