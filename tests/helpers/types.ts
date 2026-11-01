import {JwtPayload} from "../../src/app/auth/utils";

export interface UserRowSeed {
    email: string;
    phone: string;
    name: string;
    system_role: "customer" | "delivery_agent" | "restaurant_user" | "system_admin";
    deleted_at: Date | null;
}

export interface SeededUser {
    id: number;
    email: string;
    phone: string;
    name: string;
    /** Plain-text password whose bcrypt hash was stored. */
    password: string;
}

export interface RestaurantRowSeed {
    name: string;
    logo_url: string;
    status: "active" | "suspended" | "disabled" | "pending";
    primary_country: string;
}

export interface BranchRowSeed {
    country_code: string;
    address_text: string;
    label: string;
    lat: number;
    lng: number;
    is_active: boolean;
    opens_at: string;
    closes_at: string;
    accept_orders: boolean;
    delivery_radius: number;
    delivery_fee: number;
    currency: "EGP" | "SAR";
    commission: number;
}

export interface ProductRowSeed {
    name: string;
    description: string | null;
    image_url: string | null;
    category_id: number | null;
    deleted_at: Date | null;
}

export interface BranchProductSeed {
    price: number;
    stock: number;
    is_available: boolean;
}

export interface AddressRowSeed {
    label: string;
    country: string;
    city: string;
    street: string;
    building: string | null;
    apartment_number: string | null;
    type: "home" | "office" | "public_place";
    lat: number;
    long: number;
    is_default: boolean;
}

export type RoleName = "owner" | "branch_manager" | "staff";

/** A restaurant, its owner user and the owner's membership — plus the JWT the owner would get at login. */
export interface SeededRestaurant {
    restaurantId: number;
    owner: SeededUser;
    ownerMemberId: number;
    ownerJwt: JwtPayload;
}

export interface SeededMember {
    user: SeededUser;
    memberId: number;
    jwt: JwtPayload;
}

export interface WaitForOptions {
    timeoutMs?: number;
    intervalMs?: number;
}
