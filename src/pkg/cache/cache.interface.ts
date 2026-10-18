export interface ICacheProvider {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttlSeconds?: number): Promise<any>;
    del(key: string): Promise<any>;
}