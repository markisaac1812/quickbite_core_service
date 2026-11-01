import jwt from "jsonwebtoken";
import {env} from "../../src/lib/config/env";
import {JwtPayload} from "../../src/app/auth/utils";

/** System admins bypass RBAC and ownership checks — no DB row is needed. */
export const ADMIN: JwtPayload = {userId: 9000, role: "system_admin", email: "admin@test.com"};

/** Access token signed exactly like AuthService signs it (same secret, same claims). */
export function signAccessToken(user: JwtPayload, expiresInSec = env.jwt.accessExpiresIn): string {
    return jwt.sign(user, env.jwt.accessSecret, {expiresIn: expiresInSec});
}

export function signRefreshToken(user: JwtPayload, expiresInSec = env.jwt.refreshExpiresIn): string {
    return jwt.sign(user, env.jwt.refreshSecret, {expiresIn: expiresInSec});
}

/** `Cookie` header value — the guard reads the token from the `access_token` cookie. */
export function authCookie(user: JwtPayload): string {
    return `access_token=${signAccessToken(user)}`;
}

/** Header the internal (service-to-service) routes require. */
export const INTERNAL_HEADERS = {"api-key": env.internal.apiKey};

/** Pulls a cookie value out of a supertest response's `set-cookie` header. */
export function readCookie(setCookie: string[] | string | undefined, name: string): string | undefined {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const match = cookies.find((c) => c.startsWith(`${name}=`));
    return match?.split(";")[0].slice(name.length + 1);
}
