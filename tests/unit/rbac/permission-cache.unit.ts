import "reflect-metadata"; // tsyringe decorators on the service need it
jest.mock("../../../src/app/rbac/repository/permission.repo", () => ({
    getPermissionsByRoleName: jest.fn(),
}));

import {PermissionCacheService} from "../../../src/app/rbac/service/permission-cache.service";
import {getPermissionsByRoleName} from "../../../src/app/rbac/repository/permission.repo";

const fetchPermissions = jest.mocked(getPermissionsByRoleName);

describe("PermissionCacheService", () => {
    beforeEach(() => {
        fetchPermissions.mockReset();
        fetchPermissions.mockResolvedValue(["core:product:read", "orders:read"]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("loads a role's permissions once and serves repeats from memory", async () => {
        // Arrange
        const service = new PermissionCacheService();
        await service.getPermissions("staff");

        // Act
        const second = await service.getPermissions("staff");

        // Assert
        expect(second).toEqual(["core:product:read", "orders:read"]);
        expect(fetchPermissions).toHaveBeenCalledTimes(1);
    });

    it("caches each role separately", async () => {
        // Arrange
        const service = new PermissionCacheService();

        // Act
        await service.getPermissions("staff");
        await service.getPermissions("owner");

        // Assert
        expect(fetchPermissions.mock.calls).toEqual([["staff"], ["owner"]]);
    });

    it("reloads after the one-hour TTL", async () => {
        // Arrange
        const service = new PermissionCacheService();
        const start = Date.now();
        const clock = jest.spyOn(Date, "now").mockReturnValue(start);
        await service.getPermissions("staff");
        clock.mockReturnValue(start + 60 * 60 * 1000 + 1);

        // Act
        await service.getPermissions("staff");

        // Assert
        expect(fetchPermissions).toHaveBeenCalledTimes(2);
    });

    it("matches permissions on the exact resource:action pair", () => {
        // Arrange
        const service = new PermissionCacheService();
        const permissions = ["core:product:read", "core:member:read"];

        // Act
        const results = [
            service.hasPermission(permissions, "core:product", "read"),
            service.hasPermission(permissions, "core:product", "create"),
            service.hasPermission(permissions, "core:member", "delete"),
        ];

        // Assert
        expect(results).toEqual([true, false, false]);
    });
});
