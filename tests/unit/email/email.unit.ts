jest.mock("node-mailjet", () => {
    const request = jest.fn().mockResolvedValue({body: {Messages: [{Status: "success"}]}});
    const post = jest.fn(() => ({request}));
    const Mailjet = jest.fn(() => ({post}));
    return {__esModule: true, default: Mailjet, mocks: {Mailjet, post, request}};
});

import {MailjetEmailProvider} from "../../../src/pkg/email/mailjet";
import {emailProvider} from "../../../src/lib/email/init";
import {passwordResetEmail} from "../../../src/app/auth/templates/password-reset";
import {memberInvitationEmail} from "../../../src/app/rbac/templates/member-invitation";

const {mocks} = jest.requireMock("node-mailjet") as {
    mocks: {Mailjet: jest.Mock; post: jest.Mock; request: jest.Mock};
};

describe("MailjetEmailProvider", () => {
    it("is wired from the MAILJET_* env at boot", () => {
        // Arrange — lib/email/init was imported above and built its provider at load time
        const configured = {apiKey: "test", apiSecret: "test"};

        // Act
        const calls = mocks.Mailjet.mock.calls;

        // Assert
        expect(emailProvider).toBeInstanceOf(MailjetEmailProvider);
        expect(calls).toContainEqual([configured]);
    });

    it("builds the client from the configured credentials", () => {
        // Arrange
        const config = {apiKey: "key", secretKey: "secret", fromEmail: "noreply@quickbite.test", fromName: "QuickBite"};

        // Act
        new MailjetEmailProvider(config);

        // Assert
        expect(mocks.Mailjet).toHaveBeenCalledWith({apiKey: "key", apiSecret: "secret"});
    });

    it("sends one v3.1 message from the configured sender", async () => {
        // Arrange
        const provider = new MailjetEmailProvider({apiKey: "k", secretKey: "s", fromEmail: "noreply@quickbite.test", fromName: "QuickBite"});

        // Act
        await provider.send("customer@test.com", "Hello", "<p>hi</p>");

        // Assert
        expect(mocks.post).toHaveBeenCalledWith("send", {version: "v3.1"});
        expect(mocks.request).toHaveBeenCalledWith({
            Messages: [{
                From: {Email: "noreply@quickbite.test", Name: "QuickBite"},
                To: [{Email: "customer@test.com"}],
                Subject: "Hello",
                HTMLPart: "<p>hi</p>",
            }],
        });
    });

    it("propagates a provider failure", async () => {
        // Arrange
        mocks.request.mockRejectedValueOnce(new Error("401 Unauthorized"));
        const provider = new MailjetEmailProvider({apiKey: "k", secretKey: "s", fromEmail: "f@test.com", fromName: "F"});

        // Act
        const act = provider.send("c@test.com", "s", "b");

        // Assert
        await expect(act).rejects.toThrow("401 Unauthorized");
    });
});

describe("email templates", () => {
    it("renders the password-reset OTP and its 10 minute expiry", () => {
        // Arrange
        const otp = "482913";

        // Act
        const email = passwordResetEmail(otp);

        // Assert
        expect(email.subject).toBe("Reset Your Password - QuickBite");
        expect(email.html).toContain(otp);
        expect(email.html).toContain("10 minutes");
        expect(email.html.startsWith("<!DOCTYPE html>")).toBe(true);
    });

    it("renders the invitation OTP and the invited role", () => {
        // Arrange
        const otp = "771204";

        // Act
        const email = memberInvitationEmail(otp, "branch_manager");

        // Assert
        expect(email.subject).toBe("You're Invited to QuickBite");
        expect(email.html).toContain(otp);
        expect(email.html).toContain("branch_manager");
    });
});
