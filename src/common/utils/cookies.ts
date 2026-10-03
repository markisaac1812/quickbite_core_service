import {Response} from "express";
import {env} from "../config/env";
import {toMs} from "./time";

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        maxAge: toMs(1, 'h'),
        path: '/',
    });
    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        maxAge: toMs(7, 'd'),
        path: '/api/auth/refresh',
    });
}
