import {RedisCacheProvider} from "../../pkg/cache/redis";
import {env} from "../config/env";

export const cacheProvider = new RedisCacheProvider({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password ||undefined
});