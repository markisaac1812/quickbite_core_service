import "reflect-metadata";
import request from "supertest";
import {emailStub} from "../../helpers/email-stub";
import {cacheStub} from "../../helpers/cache-stub";
import {truncateAll} from "../../helpers/db";
import {insertBranch, insertUser, seedMember, seedRestaurant} from "../../helpers/factories";
import {authCookie, INTERNAL_HEADERS} from "../../helpers/auth";
import {SeededRestaurant} from "../../helpers/types";

jest.mock("../../../src/lib/email/init", () => ({emailProvider: emailStub}));
jest.mock("../../../src/lib/cache/init", () => ({cacheProvider: cacheStub}));

import {createApp} from "../../../src/app";
import {db} from "../../../src/lib/knex/knex";
import {verifyAccessToken} from "../../../src/app/auth/utils";

const app = createApp();

const invite = {email: "staff@test.com", name: "Sara", phoneNumber: "01077778888", role: "staff"};

function otpFromEmail(html: string): string {
    return html.match(/>\s*(\d{6})\s*</)![1];
}

afterAll(async () => {
    await db.destroy();
});

describe("restaurant members", () => {
    let restaurant: SeededRestaurant;
    let branchId: number;
    const membersUrl = () => `/api/restaurants/${restaurant.restaurantId}/members`;

    beforeEach(async () => {
        await truncateAll();
        emailStub.reset();
        cacheStub.reset();
        jest.restoreAllMocks();
        restaurant = await seedRestaurant();
        branchId = await insertBranch(restaurant.restaurantId);
    });

    describe("POST /api/restaurants/:restaurantId/members", () => {
        it("invites an inactive member with branches, and the emailed OTP activates them", async () => {
            // Arrange
            const body = {...invite, branchIds: [branchId]};

            // Act
            const res = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send(body);

            // Assert
            expect(res.status).toBe(200);
            const user = await db("users").where({email: "staff@test.com"}).first();
            expect(user).toMatchObject({system_role: "restaurant_user", name: "Sara", phone: "01077778888"});
            const member = await db("restaurant_members as rm").join("roles as r", "rm.role_id", "r.id").where("rm.user_id", user.id).first("rm.id", "rm.status", "r.name");
            expect(member).toMatchObject({status: "inactive", name: "staff"});
            expect((await db("member_branches").where({member_id: member.id})).map((r) => Number(r.branch_id))).toEqual([branchId]);
            expect(emailStub.sent).toHaveLength(1);
            expect(emailStub.sent[0]).toMatchObject({to: "staff@test.com", subject: "You're Invited to QuickBite"});

            // the invitee accepts and logs in with their branch scope
            const otp = otpFromEmail(emailStub.sent[0].body);
            const accept = await request(app).post("/api/auth/accept-invite").send({email: "staff@test.com", otp, newPassword: "MyOwnPass789!"});
            const login = await request(app).post("/api/auth/login").send({email: "staff@test.com", password: "MyOwnPass789!"});
            expect([accept.status, login.status]).toEqual([200, 200]);
            expect(verifyAccessToken(login.body.data.accessToken)).toMatchObject({restaurantRole: "staff", branchIds: [branchId]});
        });

        it("refuses to create another owner", async () => {
            // Arrange
            const body = {...invite, role: "owner"};

            // Act
            const res = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send(body);

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "Cannot create owner user"});
        });

        it("rejects an existing email and an unknown role", async () => {
            // Arrange
            await insertUser({email: "taken@test.com"});

            // Act
            const taken = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send({...invite, email: "taken@test.com"});
            const unknownRole = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send({...invite, role: "chef"});

            // Assert
            expect(taken.status).toBe(400);
            expect(taken.body).toEqual({error: "User already exists"});
            expect(unknownRole.status).toBe(404);
            expect(unknownRole.body).toEqual({error: "Role not found"});
        });

        it("rejects branches that belong to another restaurant", async () => {
            // Arrange
            const other = await seedRestaurant();
            const foreignBranch = await insertBranch(other.restaurantId);

            // Act
            const res = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send({...invite, branchIds: [branchId, foreignBranch]});

            // Assert
            expect(res.status).toBe(400);
            expect(res.body).toEqual({error: "Invalid branch IDs"});
            expect(await db("users").where({email: "staff@test.com"})).toHaveLength(0);
        });

        it("rolls the invite back when the email cannot be sent", async () => {
            // Arrange
            jest.spyOn(emailStub, "send").mockRejectedValueOnce(new Error("mailjet down"));

            // Act
            const res = await request(app).post(membersUrl()).set("Cookie", authCookie(restaurant.ownerJwt)).send(invite);

            // Assert
            expect(res.status).toBe(500);
            expect(await db("users").where({email: "staff@test.com"})).toHaveLength(0);
            expect(await db("restaurant_members")).toHaveLength(1); // only the owner
        });

        it("denies staff, who may only read members", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff");

            // Act
            const res = await request(app).post(membersUrl()).set("Cookie", authCookie(staff.jwt)).send(invite);

            // Assert
            expect(res.status).toBe(403);
            expect(res.body).toEqual({error: "Permission denied"});
        });
    });

    describe("GET /api/restaurants/:restaurantId/members", () => {
        it("lists members with their role for anyone holding core:member:read", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff");

            // Act
            const res = await request(app).get(membersUrl()).set("Cookie", authCookie(staff.jwt));

            // Assert
            expect(res.status).toBe(200);
            const summary = res.body.data.map((m: {email: string; role: string; roleDisplayName: string; status: string}) => [m.email, m.role, m.roleDisplayName, m.status]);
            expect(summary).toEqual(expect.arrayContaining([
                [restaurant.owner.email, "owner", "Restaurant Owner", "active"],
                [staff.user.email, "staff", "Staff Member", "active"],
            ]));
            expect(summary).toHaveLength(2);
        });

        it("hides another restaurant's members", async () => {
            // Arrange
            const other = await seedRestaurant();

            // Act
            const res = await request(app).get(membersUrl()).set("Cookie", authCookie(other.ownerJwt));

            // Assert
            expect(res.status).toBe(403);
        });
    });

    describe("PATCH /api/restaurants/:restaurantId/members/:memberId", () => {
        it("changes a member's role and status", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff");

            // Act
            const res = await request(app)
                .patch(`${membersUrl()}/${staff.memberId}`)
                .set("Cookie", authCookie(restaurant.ownerJwt))
                .send({role: "branch_manager", status: "suspended"});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({message: "Member updated successfully"});
            const row = await db("restaurant_members as rm").join("roles as r", "rm.role_id", "r.id").where("rm.id", staff.memberId).first("r.name", "rm.status");
            expect(row).toEqual({name: "branch_manager", status: "suspended"});
        });

        it("404s a member of another restaurant and an unknown role", async () => {
            // Arrange
            const other = await seedRestaurant();
            const foreign = await seedMember(other.restaurantId, "staff");
            const mine = await seedMember(restaurant.restaurantId, "staff");

            // Act
            const foreignRes = await request(app).patch(`${membersUrl()}/${foreign.memberId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({status: "inactive"});
            const roleRes = await request(app).patch(`${membersUrl()}/${mine.memberId}`).set("Cookie", authCookie(restaurant.ownerJwt)).send({role: "chef"});

            // Assert
            expect(foreignRes.status).toBe(404);
            expect(foreignRes.body).toEqual({error: "Member not found"});
            expect(roleRes.status).toBe(404);
            expect(roleRes.body).toEqual({error: "Role not found"});
        });
    });

    describe("DELETE /api/restaurants/:restaurantId/members/:memberId", () => {
        it("removes a member and their branch assignments", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff", [branchId]);

            // Act
            const res = await request(app).delete(`${membersUrl()}/${staff.memberId}`).set("Cookie", authCookie(restaurant.ownerJwt));

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({message: "Member deleted successfully"});
            expect(await db("restaurant_members").where({id: staff.memberId})).toHaveLength(0);
            expect(await db("member_branches").where({member_id: staff.memberId})).toHaveLength(0);
        });

        it("never deletes the owner, and 404s an unknown member", async () => {
            // Arrange
            const ownerMember = restaurant.ownerMemberId;

            // Act
            const owner = await request(app).delete(`${membersUrl()}/${ownerMember}`).set("Cookie", authCookie(restaurant.ownerJwt));
            const unknown = await request(app).delete(`${membersUrl()}/99999`).set("Cookie", authCookie(restaurant.ownerJwt));

            // Assert
            expect(owner.status).toBe(400);
            expect(owner.body).toEqual({error: "Cannot delete the restaurant owner"});
            expect([unknown.status]).toEqual([404]);
        });
    });

    describe("PUT /api/restaurants/:restaurantId/members/:memberId/branches", () => {
        it("replaces the member's branch assignments", async () => {
            // Arrange
            const secondBranch = await insertBranch(restaurant.restaurantId);
            const staff = await seedMember(restaurant.restaurantId, "staff", [branchId]);

            // Act
            const res = await request(app).put(`${membersUrl()}/${staff.memberId}/branches`).set("Cookie", authCookie(restaurant.ownerJwt)).send({branchIds: [secondBranch]});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual({message: "Member branch assignments updated successfully", branchIds: [secondBranch]});
            expect((await db("member_branches").where({member_id: staff.memberId})).map((r) => Number(r.branch_id))).toEqual([secondBranch]);
        });

        it("clears every assignment with an empty list", async () => {
            // Arrange
            const staff = await seedMember(restaurant.restaurantId, "staff", [branchId]);

            // Act
            const res = await request(app).put(`${membersUrl()}/${staff.memberId}/branches`).set("Cookie", authCookie(restaurant.ownerJwt)).send({branchIds: []});

            // Assert
            expect(res.status).toBe(200);
            expect(await db("member_branches").where({member_id: staff.memberId})).toHaveLength(0);
        });

        it("refuses owners, foreign branches and unknown members", async () => {
            // Arrange
            const other = await seedRestaurant();
            const foreignBranch = await insertBranch(other.restaurantId);
            const staff = await seedMember(restaurant.restaurantId, "staff");

            // Act
            const owner = await request(app).put(`${membersUrl()}/${restaurant.ownerMemberId}/branches`).set("Cookie", authCookie(restaurant.ownerJwt)).send({branchIds: [branchId]});
            const foreign = await request(app).put(`${membersUrl()}/${staff.memberId}/branches`).set("Cookie", authCookie(restaurant.ownerJwt)).send({branchIds: [foreignBranch]});
            const unknown = await request(app).put(`${membersUrl()}/99999/branches`).set("Cookie", authCookie(restaurant.ownerJwt)).send({branchIds: []});

            // Assert
            expect(owner.body).toEqual({error: "Cannot assign branches to owners, they have access to all branches"});
            expect([owner.status, foreign.status, unknown.status]).toEqual([400, 400, 404]);
        });
    });
});

describe("role permissions", () => {
    it("GET /api/roles/:role/permissions lists the role's resource:action pairs", async () => {
        // Arrange
        const role = "staff";

        // Act
        const res = await request(app).get(`/api/roles/${role}/permissions`);

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.role).toBe("staff");
        expect(res.body.permissions.map((p: {permission: string}) => p.permission).sort()).toEqual([
            "core:member:read",
            "core:product:read",
            "orders:accept",
            "orders:read",
            "orders:update",
        ]);
    });

    it("GET /api/internal/rbac/permissions resolves a role for other services and caches it", async () => {
        // Arrange
        cacheStub.reset();
        await request(app).get("/api/internal/rbac/permissions?role=branch_manager").set(INTERNAL_HEADERS);

        // Act
        const res = await request(app).get("/api/internal/rbac/permissions?role=branch_manager").set(INTERNAL_HEADERS);

        // Assert
        expect(res.status).toBe(200);
        expect(res.headers["x-cache"]).toBe("HIT");
        expect(res.body.data.role).toBe("branch_manager");
        expect(res.body.data.permissions).toEqual(expect.arrayContaining(["core:branch:update", "analytics:read", "finance:read"]));
        expect(res.body.data.permissions).not.toContain("core:member:delete");
    });

    it("GET /api/internal/rbac/permissions requires a role", async () => {
        // Arrange
        cacheStub.reset();

        // Act
        const res = await request(app).get("/api/internal/rbac/permissions").set(INTERNAL_HEADERS);

        // Assert
        expect(res.status).toBe(400);
        expect(res.body).toEqual({error: "role query is required"});
    });
});
