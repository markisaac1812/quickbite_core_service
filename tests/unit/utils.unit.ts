import {hashPassword, comparePassword} from "../../src/app/auth/utils";

describe("Password Utils", () => {
  it("should hash a password and compare it successfully", async () => {
    const password = "mySecretPassword";
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(password, hashedPassword);
    expect(isMatch).toBe(true);
  });
});