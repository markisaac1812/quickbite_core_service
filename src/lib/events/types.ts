export interface OutboxRow {
    id: string;
    aggregate_type: string;
    aggregate_id: string;
    event_type: string;
    event_id: string;
    payload: unknown;
    attempts: number;
}

export interface InsertOutboxInput {
    aggregateType: string;
    aggregateId: string | number;
    eventType: string;
    payload: unknown;
}
