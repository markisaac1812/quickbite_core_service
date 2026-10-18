import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from "../../app/auth/utils";
import {NotAuthenticatedError } from './errors';

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.access_token;
    if (!token) {
        throw NotAuthenticatedError;
    }

    try {
        req.user = verifyAccessToken(token);
        next();
    } catch {
        throw NotAuthenticatedError;
    }
}