import type {Request, Response, NextFunction} from "express";
import {v4 as uuidv4} from 'uuid';

// Same convention as order-service and analytics-service: reuse an incoming
// X-CorrelationId (or X-Correlation-Id) so one request can be traced across
// services, otherwise mint one. The same id goes on the request (logs, error
// responses) and back to the caller in the response header.
export function correlationId(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers["x-correlationid"] ?? req.headers["x-correlation-id"];
    const incoming = Array.isArray(raw) ? raw[0] : raw;
    const id = incoming && incoming.length <= 128 ? incoming : uuidv4();
    req.correlationId = id;
    res.setHeader('X-CorrelationId', id);
    next();
}
