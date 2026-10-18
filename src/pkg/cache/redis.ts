import Redis from "ioredis";
import type {ICacheProvider} from "./cache.interface";

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
}

export class RedisCacheProvider implements ICacheProvider {
    private readonly client: Redis;

    constructor(private readonly config: RedisConfig) {
        this.client = new Redis({
            host: config.host,
            port: config.port,
            password: config.password,
            lazyConnect: true,
            maxRetriesPerRequest: 3
        });

        this.client.on("error", (err) => {console.error("Redis Error:", err.message);});
        this.client.connect().catch((err) => {console.error("Redis Connect Error:", err)});
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<any> {
        if(ttlSeconds) {
            await this.client.set(key, value, "EX", ttlSeconds);
        } else {
            await this.client.set(key, value);
        }

    }

    async get(key: string): Promise<any> {
        return this.client.get(key);
    }

    async del(key: string): Promise<any> {
       return this.client.del(key);
    }

}    