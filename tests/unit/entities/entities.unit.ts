import {User} from "../../../src/app/user/entity/user.entity";
import {SystemRole} from "../../../src/app/user/entity/enums";
import {Restaurant} from "../../../src/app/restaurant/entity/restaurant.entity";
import {RestaurantStatus} from "../../../src/app/restaurant/entity/enums";
import {Branch} from "../../../src/app/branch/entity/branch.entity";
import {BranchCurrency} from "../../../src/app/branch/entity/enums";
import {Product} from "../../../src/app/product/entity/product.entity";
import {ProductBranchDetails} from "../../../src/app/product/entity/product-branch.entity";
import {ProductCategory} from "../../../src/app/product/entity/product-category.entity";
import {RestaurantMember} from "../../../src/app/rbac/entity/restaurant-member.entity";
import {MemberStatus} from "../../../src/app/rbac/entity/enums";
import {MemberBranch} from "../../../src/app/rbac/entity/member-branch.entity";
import {Permission} from "../../../src/app/rbac/entity/permissions.entity";
import {Role} from "../../../src/app/rbac/entity/role.enitity";
import {CustomerAddress} from "../../../src/app/customer-address/entity/customer-address.entity";
import {AddressType} from "../../../src/app/customer-address/entity/enums";
import {PasswordReset} from "../../../src/app/auth/entity/password-reset.entity";

const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("entities — defaults for nullable columns", () => {
    it("User: timestamps default to now and deletedAt to null", () => {
        // Arrange
        const before = Date.now();

        // Act
        const user = new User({id: 1, email: "a@test.com", systemRole: SystemRole.CUSTOMER});

        // Assert
        expect(user.deletedAt).toBeNull();
        expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(new User({createdAt: T0, updatedAt: T0, deletedAt: T0}).deletedAt).toBe(T0);
    });

    it("Restaurant: empty logo and a status timestamp by default", () => {
        // Arrange
        const data = {id: 1, ownerId: 2, name: "R", status: RestaurantStatus.PENDING, primaryCountry: "EG"};

        // Act
        const restaurant = new Restaurant(data);
        const withValues = new Restaurant({...data, logoURL: "x.png", createdAt: T0, updatedAt: T0, statusUpdatedAt: null});

        // Assert
        expect(restaurant.logoURL).toBe("");
        expect(restaurant.statusUpdatedAt).toBeInstanceOf(Date);
        expect(withValues.logoURL).toBe("x.png");
        expect(withValues.createdAt).toBe(T0);
    });

    it("Branch: radius, fee and commission default to 0", () => {
        // Arrange
        const data = {id: 1, restaurantId: 2, currency: BranchCurrency.EGP};

        // Act
        const branch = new Branch(data);
        const explicit = new Branch({...data, deliveryRadius: 5, deliveryFee: 2000, commission: 10, createdAt: T0, updatedAt: T0});

        // Assert
        expect([branch.deliveryRadius, branch.deliveryFee, branch.commission]).toEqual([0, 0, 0]);
        expect([explicit.deliveryRadius, explicit.deliveryFee, explicit.commission]).toEqual([5, 2000, 10]);
        expect(explicit.updatedAt).toBe(T0);
    });

    it("Product, ProductBranchDetails and ProductCategory defaults", () => {
        // Arrange
        const productData = {id: 1, name: "Koshary", restaurantId: 2};

        // Act
        const product = new Product(productData);
        const described = new Product({...productData, description: "d", imageUrl: "i", categoryId: 3, createdAt: T0, updatedAt: T0});
        const details = new ProductBranchDetails({id: 1, branchId: 2, productId: 3});
        const stocked = new ProductBranchDetails({price: 100, stock: 4, isAvailable: true});
        const category = new ProductCategory({id: 1, restaurantId: 2, name: "Mains"});
        const datedCategory = new ProductCategory({createdAt: T0, updatedAt: T0});

        // Assert
        expect([product.description, product.imageUrl, product.categoryId]).toEqual(["", "", null]);
        expect([described.description, described.imageUrl, described.categoryId]).toEqual(["d", "i", 3]);
        expect([details.price, details.stock, details.isAvailable]).toEqual([0, 0, false]);
        expect([stocked.price, stocked.stock, stocked.isAvailable]).toEqual([100, 4, true]);
        expect(category.createdAt).toBeInstanceOf(Date);
        expect(datedCategory.updatedAt).toBe(T0);
    });

    it("RBAC entities default to an active member and fresh timestamps", () => {
        // Arrange
        const memberData = {id: 1, restaurantId: 2, userId: 3, roleId: 1};

        // Act
        const member = new RestaurantMember(memberData);
        const inactive = new RestaurantMember({...memberData, status: MemberStatus.INACTIVE, createdAt: T0, updatedAt: T0});
        const link = new MemberBranch({memberId: 1, branchId: 2});
        const datedLink = new MemberBranch({memberId: 1, branchId: 2, createdAt: T0});
        const permission = new Permission({id: 1, resource: "core:product", action: "read"});
        const datedPermission = new Permission({createdAt: T0});
        const role = new Role({id: 1, name: "owner", displayName: "Restaurant Owner"});
        const datedRole = new Role({createdAt: T0, updatedAt: T0, description: "all"});

        // Assert
        expect(member.status).toBe(MemberStatus.ACTIVE);
        expect(inactive.status).toBe(MemberStatus.INACTIVE);
        expect(inactive.createdAt).toBe(T0);
        expect(link.createdAt).toBeInstanceOf(Date);
        expect(datedLink.createdAt).toBe(T0);
        expect(permission.createdAt).toBeInstanceOf(Date);
        expect(datedPermission.createdAt).toBe(T0);
        expect(role.description).toBeUndefined();
        expect([datedRole.createdAt, datedRole.description]).toEqual([T0, "all"]);
    });

    it("CustomerAddress: building and apartment default to null", () => {
        // Arrange
        const data = {id: 1, userId: 2, label: "Home", type: AddressType.HOME, lat: 30, lng: 31, isDefault: true};

        // Act
        const address = new CustomerAddress(data);
        const full = new CustomerAddress({...data, building: "12", apartmentNumber: "3"});

        // Assert
        expect([address.building, address.apartmentNumber]).toEqual([null, null]);
        expect([full.building, full.apartmentNumber]).toEqual(["12", "3"]);
    });
});

describe("PasswordReset.isExpired", () => {
    it("is expired once expiresAt is in the past", () => {
        // Arrange
        const past = new PasswordReset({id: 1, userId: 1, expiresAt: new Date(Date.now() - 1000)});
        const future = new PasswordReset({id: 2, userId: 1, expiresAt: new Date(Date.now() + 60_000), consumedAt: T0});

        // Act
        const results = [past.isExpired(), future.isExpired()];

        // Assert
        expect(results).toEqual([true, false]);
        expect(past.consumedAt).toBeNull();
        expect(future.consumedAt).toBe(T0);
    });
});
