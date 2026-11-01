import jwt from "jsonwebtoken";
import {
    comparePassword,
    createAccessToken,
    createRefreshToken,
    generateOTP,
    hashOTP,
    hashPassword,
    JwtPayload,
    verifyAccessToken,
    verifyRefreshToken,
} from "../../../src/app/auth/utils";
import {env} from "../../../src/lib/config/env";

const OWNER: JwtPayload = {userId: 7, email: "owner@test.com", role: "restaurant_user", restaurantId: 3, restaurantRole: "owner", branchIds: [1, 2]};

describe("access / refresh tokens", () => {
    it("round-trips the restaurant claims through an access token", () => {
        // Arrange
        const token = createAccessToken(OWNER);

        // Act
        const payload = verifyAccessToken(token);

        // Assert
        expect(payload).toMatchObject(OWNER);
        expect(payload).toHaveProperty("exp");
    });

    it("expires the access token after ACCESS_EXPIRES_IN seconds", () => {
        // Arrange
        const token = createAccessToken(OWNER);

        // Act
        const decoded = jwt.decode(token) as {iat: number; exp: number};

        // Assert
        expect(decoded.exp - decoded.iat).toBe(env.jwt.accessExpiresIn);
    });

    it("signs refresh tokens with their own secret", () => {
        // Arrange
        const refresh = createRefreshToken(OWNER);

        // Act
        const verifyAsAccess = () => verifyAccessToken(refresh);
        const payload = verifyRefreshToken(refresh);

        // Assert
        expect(verifyAsAccess).toThrow(jwt.JsonWebTokenError);
        expect(payload.userId).toBe(7);
    });

    it("rejects a tampered token", () => {
        // Arrange
        const token = createAccessToken(OWNER);
        const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");

        // Act
        const act = () => verifyAccessToken(tampered);

        // Assert
        expect(act).toThrow();
    });
});

describe("passwords", () => {
    it("rejects the wrong password against a bcrypt hash", async () => {
        // Arrange
        const hash = await hashPassword("StrongPassword123@");

        // Act
        const matches = await comparePassword("WrongPassword123@", hash);

        // Assert
        expect(hash).not.toContain("StrongPassword123@");
        expect(matches).toBe(false);
    });
});

describe("OTP helpers", () => {
    it("generates 6-digit numeric codes", () => {
        // Arrange
        const samples = Array.from({length: 50}, () => generateOTP());

        // Act
        const allSixDigits = samples.every((otp) => /^\d{6}$/.test(otp));

        // Assert
        expect(allSixDigits).toBe(true);
    });

    it("hashes an OTP deterministically as hex sha256", () => {
        // Arrange
        const otp = "123456";

        // Act
        const [first, second, other] = [hashOTP(otp), hashOTP(otp), hashOTP("654321")];

        // Assert
        expect(first).toBe("8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92");
        expect(second).toBe(first);
        expect(other).not.toBe(first);
    });
});
