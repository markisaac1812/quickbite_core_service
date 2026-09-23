import type {Request, Response, NextFunction} from "express";
import {v4 as uuidv4} from 'uuid';

export function correlationId(req: Request, res: Response, next: NextFunction) {
    req.correlationId = uuidv4();
    res.setHeader('X-CorrelationId', uuidv4());
    next();
}
