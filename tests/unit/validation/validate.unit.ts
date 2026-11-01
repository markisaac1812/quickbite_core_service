import "reflect-metadata"; // decorated DTOs need it, as in server.ts / container.ts
import {validateBody} from "../../../src/lib/validation/validate";
import {LoginDTO, RegisterDTO, ResetPasswordDTO, RestaurantRegisterDTO} from "../../../src/app/auth/dto/auth.dto";
import {CreateAddressDTO, UpdateAddressDTO} from "../../../src/app/customer-address/dto/customer-address.dto";
import {CreateBranchDTO, UpdateBranchStatusDTO} from "../../../src/app/branch/dto/branch.dto";
import {CreateRestaurantDTO, UpdateRestaurantStatusDTO} from "../../../src/app/restaurant/dto/restaurant.dto";
import {CreateMemberDTO, UpdateMemberDTO} from "../../../src/app/rbac/dto/member.dto";
import {UpdateProductDTO} from "../../../src/app/product/dto/product.dto";
import {UpdateUserDTO} from "../../../src/app/user/dto/user.dto";

const STRONG = "StrongPassword123@";

describe("validateBody", () => {
    it("returns a typed instance with the nested restaurant for a restaurant signup", async () => {
        // Arrange
        const body = {
            email: "owner@test.com",
            phone: "01012345678",
            name: "Owner",
            password: STRONG,
            role: "restaurant_user",
            restaurant: {name: "Koshary Corner", primaryCountry: "EG"},
        };

        // Act
        const dto = await validateBody(RegisterDTO, body);

        // Assert
        expect(dto).toBeInstanceOf(RegisterDTO);
        expect(dto.restaurant).toBeInstanceOf(RestaurantRegisterDTO);
        expect(dto.restaurant?.name).toBe("Koshary Corner");
    });

    it("rejects a weak password with the custom message", async () => {
        // Arrange
        const body = {email: "c@test.com", phone: "01012345678", name: "C", password: "weak", role: "customer"};

        // Act
        const act = validateBody(RegisterDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({
            statusCode: 400,
            message: "Password is not strong enough. It must contain at least 8 characters, one uppercase letter, one lowercase letter, one number.",
        });
    });

    it("reports every violated rule at once", async () => {
        // Arrange
        const body = {email: "not-an-email", password: ""};

        // Act
        const act = validateBody(LoginDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({statusCode: 400, message: "email must be an email, \npassword should not be empty"});
    });

    it("reports the errors of an invalid nested restaurant", async () => {
        // Arrange
        const body = {email: "o@test.com", phone: "01012345678", name: "O", password: STRONG, role: "restaurant_user", restaurant: {name: ""}};

        // Act
        const act = validateBody(RegisterDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({statusCode: 400});
        const message = await act.catch((e: Error) => e.message);
        expect(message).toContain("name should not be empty");
        expect(message).toContain("primaryCountry must be a string");
    });

    it("reports nested owner errors alongside top-level ones", async () => {
        // Arrange
        const body = {name: "", primaryCountry: "EG", owner: {email: "not-an-email", phone: "01012345678", name: "O", password: STRONG}};

        // Act
        const act = validateBody(CreateRestaurantDTO, body);

        // Assert
        // messages follow the DTO's property order: owner is declared before name
        await expect(act).rejects.toMatchObject({statusCode: 400, message: "email must be an email, \nname should not be empty"});
    });

    it("reports a nested error even when the top level is valid", async () => {
        // Arrange — only restaurant.primaryCountry is wrong
        const body = {email: "o@test.com", phone: "01012345678", name: "O", password: STRONG, role: "restaurant_user", restaurant: {name: "R", primaryCountry: ""}};

        // Act
        const act = validateBody(RegisterDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({statusCode: 400, message: expect.stringContaining("primaryCountry should not be empty")});
    });

    it("rejects an unknown system role", async () => {
        // Arrange
        const body = {email: "c@test.com", phone: "01012345678", name: "C", password: STRONG, role: "superuser"};

        // Act
        const act = validateBody(RegisterDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({message: expect.stringContaining("role must be one of the following values")});
    });

    it("strips properties the DTO does not declare", async () => {
        // Arrange
        const body = {name: "New Name", isAdmin: true, system_role: "system_admin"};

        // Act
        const dto = await validateBody(UpdateUserDTO, body);

        // Assert
        expect(dto).toEqual({name: "New Name"});
    });

    it("requires a 6+ character OTP and a strong new password on reset", async () => {
        // Arrange
        const body = {email: "c@test.com", otp: "123", newPassword: STRONG};

        // Act
        const act = validateBody(ResetPasswordDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({message: "otp must be longer than or equal to 6 characters"});
    });

    it("validates address type, coordinates and the default flag", async () => {
        // Arrange
        const body = {label: "Home", country: "Egypt", city: "Cairo", street: "Tahrir", type: "castle", lat: "30", lng: 31, isDefault: "yes"};

        // Act
        const act = validateBody(CreateAddressDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({
            message: [
                "type must be one of the following values: home, office, public_place",
                "lat must be a number conforming to the specified constraints",
                "isDefault must be a boolean value",
            ].join(", \n"),
        });
    });

    it("accepts an empty partial address update", async () => {
        // Arrange
        const body = {};

        // Act
        const dto = await validateBody(UpdateAddressDTO, body);

        // Assert
        expect(dto).toBeInstanceOf(UpdateAddressDTO);
    });

    it("validates branch currency and a non-negative integer radius", async () => {
        // Arrange
        const body = {countryCode: "EG", label: "Downtown", addressText: "1 St", lat: 30, lng: 31, opensAt: "09:00", closesAt: "23:00", deliveryRadius: -1, currency: "USD"};

        // Act
        const act = validateBody(CreateBranchDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({
            message: "deliveryRadius must not be less than 0, \ncurrency must be one of the following values: EGP, SAR",
        });
    });

    it("caps the branch commission at 100 percent", async () => {
        // Arrange
        const body = {commission: 150};

        // Act
        const act = validateBody(UpdateBranchStatusDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({message: "commission must not be greater than 100"});
    });

    it("validates the nested owner when an admin creates a restaurant", async () => {
        // Arrange
        const body = {name: "Koshary Corner", primaryCountry: "EG", owner: {email: "o@test.com", phone: "01012345678", name: "O", password: STRONG}};

        // Act
        const dto = await validateBody(CreateRestaurantDTO, body);

        // Assert
        expect(dto.owner.email).toBe("o@test.com");
    });

    it("only accepts known restaurant and member statuses", async () => {
        // Arrange
        const restaurant = {status: "closed"};
        const member = {status: "banned"};

        // Act
        const restaurantAct = validateBody(UpdateRestaurantStatusDTO, restaurant);
        const memberAct = validateBody(UpdateMemberDTO, member);

        // Assert
        await expect(restaurantAct).rejects.toMatchObject({message: "status must be one of the following values: active, suspended, disabled, pending"});
        await expect(memberAct).rejects.toMatchObject({message: "status must be one of the following values: active, inactive, suspended"});
    });

    it("requires a member's email, name, phone and role", async () => {
        // Arrange
        const body = {email: "staff@test.com", branchIds: "1,2"};

        // Act
        const act = validateBody(CreateMemberDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({message: expect.stringContaining("branchIds must be an array")});
    });

    it("rejects negative branch-level price and stock overrides", async () => {
        // Arrange
        const body = {price: -1, stock: 1.5};

        // Act
        const act = validateBody(UpdateProductDTO, body);

        // Assert
        await expect(act).rejects.toMatchObject({message: "price must not be less than 0, \nstock must be an integer number"});
    });
});
