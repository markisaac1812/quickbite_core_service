import {toMs} from "../../../common/utils/time";
import {getPermissionsByRoleName} from "../repository/permission.repo";

class PermissionCacheService {
    private cache:Map<string, {permissions:string[], cachedAt:number}> = new Map();
    private readonly TTL = toMs(1,'h');

    async getPermissions(roleName: string): Promise<string[]> {
        // check cache, if it is in the cache, return it, if not ftch from db
        const cached = this.cache.get(roleName);
        if(cached && Date.now() - cached.cachedAt < this.TTL) {
            return cached.permissions
        }
        // after calling db, to insert it into the cache
        const permissions = await getPermissionsByRoleName(roleName);
        this.cache.set(roleName,{permissions, cachedAt: Date.now()});

        return permissions;
    }

    hasPermission(permissions: string[], resource: string, action: string): boolean {
        return permissions.includes(`${resource}:${action}`);
    }
}

export const permissionCacheService = new PermissionCacheService();