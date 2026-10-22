import type {Request, Response, NextFunction} from "express";
import {env} from "../config/env";

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction) {
    if (!env.internal.apiKey) {
        return res.status(500).json({error: "Internal api key not configured"});
    }
    if (req.headers["api-key"] != env.internal.apiKey) {
        return res.status(401).json({error: "Invalid api key"});
    }
    next();
}
