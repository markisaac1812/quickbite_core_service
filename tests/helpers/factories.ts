import {randomUUID} from "crypto";
import bcrypt from "bcrypt";
import {db} from "../../src/lib/knex/knex";
import {hashOTP} from "../../src/app/auth/utils";
import {
    AddressRowSeed,
    BranchProductSeed,
    BranchRowSeed,
    ProductRowSeed,
    RestaurantRowSeed,
    RoleName,
    SeededMember,
    SeededRestaurant,
    SeededUser,
    UserRowSeed,
} from "./types";

/**
 * Seeds rows straight into the test DB (no repos/services) so tests arrange
 * state independently of the code under test. Every factory returns numeric
 * ids — pg hands BIGSERIAL ids back as strings.
 */

export const DEFAULT_PASSWORD = "StrongPassword123@";

// bcrypt is slow by design — hash the shared default password once per file.
let defaultHash: Promise<string> | null = null;
function hashFor(password: string): Promise<string> {
    if (password !== DEFAULT_PASSWORD) return bcrypt.hash(password, 4);
    defaultHash ??= bcrypt.hash(DEFAULT_PASSWORD, 4);
    return defaultHash;
}

let phoneSeq = 0;
function uniquePhone(): string {
    phoneSeq += 1;
    return `010${String(Date.now() % 1_000_000).padStart(6, "0")}${String(phoneSeq % 100).padStart(2, "0")}`;
}

export async function insertUser(overrides: Partial<UserRowSeed> & {password?: string} = {}): Promise<SeededUser> {
    const {password = DEFAULT_PASSWORD, ...rest} = overrides;
    const now = new Date();
    const row: UserRowSeed = {
        email: `user-${randomUUID()}@test.com`,
        phone: uniquePhone(),
        name: "Test User",
        system_role: "customer",
        deleted_at: null,
        ...rest,
    };
    const [inserted] = await db("users")
        .insert({...row, password_hash: await hashFor(password), created_at: now, updated_at: now})
        .returning("id");
    return {id: Number(inserted.id), email: row.email, phone: row.phone, name: row.name, password};
}

export async function insertRestaurant(ownerId: number, overrides: Partial<RestaurantRowSeed> = {}): Promise<number> {
    const now = new Date();
    const row: RestaurantRowSeed = {
        name: "Koshary Corner",
        logo_url: "https://cdn.test/logo.png",
        status: "active",
        primary_country: "EG",
        ...overrides,
    };
    const [inserted] = await db("restaurants")
        .insert({...row, owner_id: ownerId, created_at: now, updated_at: now, status_updated_at: now})
        .returning("id");
    return Number(inserted.id);
}

export async function insertBranch(restaurantId: number, overrides: Partial<BranchRowSeed> = {}): Promise<number> {
    const now = new Date();
    const row: BranchRowSeed = {
        country_code: "EG",
        address_text: "1 Talaat Harb St, Cairo",
        label: "Downtown",
        lat: 30.05,
        lng: 31.24,
        is_active: true,
        opens_at: "09:00",
        closes_at: "23:00",
        accept_orders: true,
        delivery_radius: 5,
        delivery_fee: 2000,
        currency: "EGP",
        commission: 10,
        ...overrides,
    };
    const [inserted] = await db("restaurant_branches")
        .insert({...row, restaurant_id: restaurantId, created_at: now, updated_at: now})
        .returning("id");
    return Number(inserted.id);
}

export async function insertCategory(restaurantId: number, name = "Mains"): Promise<number> {
    const now = new Date();
    const [inserted] = await db("product_categories")
        .insert({restaurant_id: restaurantId, name, created_at: now, updated_at: now})
        .returning("id");
    return Number(inserted.id);
}

/**
 * The `trg_product_after_insert` trigger adds a product_branch_details row
 * (price 0, stock 0, unavailable) for every branch the restaurant already has.
 */
export async function insertProduct(restaurantId: number, overrides: Partial<ProductRowSeed> = {}): Promise<number> {
    const now = new Date();
    const row: ProductRowSeed = {
        name: "Koshary (large)",
        description: "Rice, lentils, pasta",
        image_url: null,
        category_id: null,
        deleted_at: null,
        ...overrides,
    };
    const [inserted] = await db("products")
        .insert({...row, restaurant_id: restaurantId, created_at: now, updated_at: now})
        .returning("id");
    return Number(inserted.id);
}

/** Sets the branch-level price/stock row the trigger created for (branch, product). */
export async function setBranchProduct(branchId: number, productId: number, overrides: Partial<BranchProductSeed> = {}): Promise<void> {
    const row: BranchProductSeed = {price: 7500, stock: 10, is_available: true, ...overrides};
    const updated = await db("product_branch_details").where({branch_id: branchId, product_id: productId}).update(row);
    if (updated === 0) {
        await db("product_branch_details").insert({...row, branch_id: branchId, product_id: productId});
    }
}

export async function insertMember(
    restaurantId: number,
    userId: number,
    role: RoleName,
    options: {status?: "active" | "inactive" | "suspended"; branchIds?: number[]} = {},
): Promise<number> {
    const now = new Date();
    const roleRow = await db("roles").select("id").where({name: role}).first();
    const [inserted] = await db("restaurant_members")
        .insert({
            restaurant_id: restaurantId,
            user_id: userId,
            role_id: roleRow.id,
            status: options.status ?? "active",
            created_at: now,
            updated_at: now,
        })
        .returning("id");
    const memberId = Number(inserted.id);
    if (options.branchIds?.length) {
        await db("member_branches").insert(options.branchIds.map((branchId) => ({member_id: memberId, branch_id: branchId, created_at: now})));
    }
    return memberId;
}

export async function insertAddress(userId: number, overrides: Partial<AddressRowSeed> = {}): Promise<number> {
    const row: AddressRowSeed = {
        label: "Home",
        country: "Egypt",
        city: "Cairo",
        street: "Tahrir St",
        building: "12",
        apartment_number: "3",
        type: "home",
        lat: 30.0444,
        long: 31.2357,
        is_default: false,
        ...overrides,
    };
    const [inserted] = await db("customer_addresses").insert({...row, user_id: userId}).returning("id");
    return Number(inserted.id);
}

export async function insertPasswordReset(
    userId: number,
    otp: string,
    overrides: {expiresAt?: Date; consumedAt?: Date | null} = {},
): Promise<number> {
    const now = new Date();
    const [inserted] = await db("password_resets")
        .insert({
            user_id: userId,
            otp_hashed: hashOTP(otp),
            expires_at: overrides.expiresAt ?? new Date(now.getTime() + 10 * 60 * 1000),
            created_at: now,
            consumed_at: overrides.consumedAt ?? null,
        })
        .returning("id");
    return Number(inserted.id);
}

// ---------------------------------------------------------------------------
// Scenarios — the common "who is calling" setups, with the JWT each one gets.
// ---------------------------------------------------------------------------

/** Restaurant owner user + restaurant + active owner membership. */
export async function seedRestaurant(overrides: Partial<RestaurantRowSeed> = {}): Promise<SeededRestaurant> {
    const owner = await insertUser({system_role: "restaurant_user", name: "Owner"});
    const restaurantId = await insertRestaurant(owner.id, overrides);
    const ownerMemberId = await insertMember(restaurantId, owner.id, "owner");
    return {
        restaurantId,
        owner,
        ownerMemberId,
        ownerJwt: {userId: owner.id, role: "restaurant_user", email: owner.email, restaurantId, restaurantRole: "owner", branchIds: []},
    };
}

/** A non-owner restaurant member (branch_manager / staff) assigned to `branchIds`. */
export async function seedMember(
    restaurantId: number,
    role: Exclude<RoleName, "owner">,
    branchIds: number[] = [],
    status: "active" | "inactive" | "suspended" = "active",
): Promise<SeededMember> {
    const user = await insertUser({system_role: "restaurant_user", name: `A ${role}`});
    const memberId = await insertMember(restaurantId, user.id, role, {status, branchIds});
    return {
        user,
        memberId,
        jwt: {userId: user.id, role: "restaurant_user", email: user.email, restaurantId, restaurantRole: role, branchIds},
    };
}

export async function outboxEvents(): Promise<{event_type: string; aggregate_type: string; aggregate_id: string; payload: unknown}[]> {
    return db("events_outbox").select("event_type", "aggregate_type", "aggregate_id", "payload").orderBy("id", "asc");
}
