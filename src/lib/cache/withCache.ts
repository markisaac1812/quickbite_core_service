import {Request, Response, NextFunction} from "express";
import {ICacheProvider} from "../../pkg/cache/cache.interface";
import {container} from "../di/container";
import {TOKENS} from "../di/tokens";

export function withCache(ttl = 3600, userScoped = false) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cacheProvider: ICacheProvider = container.resolve(TOKENS.CacheProvider);

            let key = `${req.method}:${req.originalUrl}`;

            if (userScoped) {
                key = `${key}:${req.user?.userId}`;
            }

            const cached = await cacheProvider.get(key);
            if (cached) {
                res.setHeader("X-Cache", "HIT");
                return res.status(200).json(JSON.parse(cached));
            }

            const originalJson = res.json.bind(res);

            res.json = ((body: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cacheProvider.set(key, JSON.stringify(body), ttl)
                }
                res.setHeader("X-Cache", "MISS");
                return originalJson(body);
            });
            next();
        }
        catch (err) {
            next(err);
        }
    }
}