jest.mock("../../../src/app/rbac/service/permission-cache.service", () => ({
    permissionCacheService: {
        getPermissions: jest.fn(),
        hasPermission: (permissions: string[], resource: string, action: string) => permissions.includes(`${resource}:${action}`),
    },
}));

import {rbac, requireBranchAccess, requireRestaurantMember} from "../../../src/lib/auth/rbac";
import {permissionCacheService} from "../../../src/app/rbac/service/permission-cache.service";
import {NotAuthenticatedError} from "../../../src/lib/auth/errors";
import {mockNext, mockRequest, mockResponse} from "../../helpers/http-mocks";

const getPermissions = jest.mocked(permissionCacheService.getPermissions);

const ADMIN = {userId: 900, email: "admin@test.com", role: "system_admin"};
const CUSTOMER = {userId: 1, email: "c@test.com", role: "customer"};
const STAFF = {userId: 5, email: "s@test.com", role: "restaurant_user", restaurantId: 10, restaurantRole: "staff", branchIds: [20]};
const OWNER = {...STAFF, userId: 4, restaurantRole: "owner", branchIds: []};

describe("rbac", () => {
    beforeEach(() => {
        getPermissions.mockReset();
    });

    it("lets a system admin bypass the permission lookup", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await rbac({resource: "core:product", action: "create"})(mockRequest({user: ADMIN}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledWith();
        expect(getPermissions).not.toHaveBeenCalled();
    });

    it("checks the admin like anyone else when allowSystemAdmin is false", async () => {
        // Arrange
        const res = mockResponse();

        // Act
        await rbac({resource: "core:product", action: "create", allowSystemAdmin: false})(mockRequest({user: ADMIN}), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(403);
    });

    it("allows a restaurant user whose role grants resource:action", async () => {
        // Arrange
        getPermissions.mockResolvedValue(["core:product:read", "core:member:read"]);
        const next = mockNext();

        // Act
        await rbac({resource: "core:product", action: "read"})(mockRequest({user: STAFF}), mockResponse(), next);

        // Assert
        expect(getPermissions).toHaveBeenCalledWith("staff");
        expect(next).toHaveBeenCalledWith();
    });

    it("denies a restaurant user whose role lacks the permission", async () => {
        // Arrange
        getPermissions.mockResolvedValue(["core:product:read"]);
        const res = mockResponse();
        const next = mockNext();

        // Act
        await rbac({resource: "core:product", action: "create"})(mockRequest({user: STAFF}), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentStatus).toBe(403);
        expect(res.sentBody).toEqual({error: "Permission denied"});
    });

    it("denies customers and agents outright", async () => {
        // Arrange
        const res = mockResponse();

        // Act
        await rbac({resource: "core:product", action: "read"})(mockRequest({user: CUSTOMER}), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(403);
        expect(getPermissions).not.toHaveBeenCalled();
    });

    it("forwards NotAuthenticated when no user is attached", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await rbac({resource: "core:product", action: "read"})(mockRequest(), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledWith(NotAuthenticatedError);
    });

    it("forwards a permission-lookup failure to the error handler", async () => {
        // Arrange
        const dbDown = new Error("connection refused");
        getPermissions.mockRejectedValue(dbDown);
        const next = mockNext();

        // Act
        await rbac({resource: "core:product", action: "read"})(mockRequest({user: STAFF}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledWith(dbDown);
    });
});

describe("requireRestaurantMember", () => {
    it("passes a member of the restaurant in the route", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await requireRestaurantMember()(mockRequest({user: STAFF, params: {restaurantId: "10"}}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });

    it("rejects a member of another restaurant with 403", async () => {
        // Arrange
        const res = mockResponse();
        const next = mockNext();

        // Act
        await requireRestaurantMember("id")(mockRequest({user: STAFF, params: {id: "11"}}), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentStatus).toBe(403);
        expect(res.sentBody).toEqual({error: "Permission denied"});
    });

    it("lets a system admin into any restaurant", async () => {
        // Arrange
        const next = mockNext();

        // Act
        await requireRestaurantMember()(mockRequest({user: ADMIN, params: {restaurantId: "99"}}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });

    it("answers 500 when the route param is not a number", async () => {
        // Arrange
        const res = mockResponse();

        // Act
        await requireRestaurantMember()(mockRequest({user: STAFF, params: {restaurantId: "abc"}}), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(500);
    });
});

describe("requireBranchAccess", () => {
    it("lets admins and owners into every branch", () => {
        // Arrange
        const next = mockNext();

        // Act
        requireBranchAccess()(mockRequest({user: ADMIN, params: {branchId: "77"}}), mockResponse(), next);
        requireBranchAccess()(mockRequest({user: OWNER, params: {branchId: "77"}}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledTimes(2);
    });

    it("lets staff into an assigned branch given as a param or a query", () => {
        // Arrange
        const next = mockNext();

        // Act
        requireBranchAccess()(mockRequest({user: STAFF, params: {branchId: "20"}}), mockResponse(), next);
        requireBranchAccess()(mockRequest({user: STAFF, query: {branchId: "20"}}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledTimes(2);
    });

    it("rejects staff from a branch they are not assigned to", () => {
        // Arrange
        const res = mockResponse();
        const next = mockNext();

        // Act
        requireBranchAccess()(mockRequest({user: STAFF, params: {branchId: "21"}}), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentStatus).toBe(403);
        expect(res.sentBody).toEqual({error: "You do not have access to this branch"});
    });

    it("rejects a user with no branch list", () => {
        // Arrange
        const res = mockResponse();

        // Act
        requireBranchAccess()(mockRequest({user: {...STAFF, branchIds: undefined}, params: {branchId: "20"}}), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(403);
    });

    it("passes through when the endpoint has no branch in scope", () => {
        // Arrange
        const next = mockNext();

        // Act
        requireBranchAccess()(mockRequest({user: STAFF}), mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });
});
