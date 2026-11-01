import {authenticate} from "../../../src/lib/auth/guard";
import {requireInternalApiKey} from "../../../src/lib/auth/api-key";
import {NotAuthenticatedError} from "../../../src/lib/auth/errors";
import {createAccessToken, createRefreshToken} from "../../../src/app/auth/utils";
import {env} from "../../../src/lib/config/env";
import {mockNext, mockRequest, mockResponse} from "../../helpers/http-mocks";

const CUSTOMER = {userId: 1, email: "customer@test.com", role: "customer"};

describe("authenticate", () => {
    it("attaches the verified access-token payload to req.user", () => {
        // Arrange
        const req = mockRequest({cookies: {access_token: createAccessToken(CUSTOMER)}});
        const next = mockNext();

        // Act
        authenticate(req, mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalledWith();
        expect(req.user).toMatchObject(CUSTOMER);
    });

    it("throws NotAuthenticated when the cookie is missing", () => {
        // Arrange
        const req = mockRequest({cookies: {}});
        const next = mockNext();

        // Act
        const act = () => authenticate(req, mockResponse(), next);

        // Assert
        expect(act).toThrow(NotAuthenticatedError);
        expect(next).not.toHaveBeenCalled();
    });

    it("throws NotAuthenticated for a token signed with another secret", () => {
        // Arrange — a refresh token is signed with REFRESH_SECRET
        const req = mockRequest({cookies: {access_token: createRefreshToken(CUSTOMER)}});

        // Act
        const act = () => authenticate(req, mockResponse(), mockNext());

        // Assert
        expect(act).toThrow(NotAuthenticatedError);
        expect(NotAuthenticatedError.statusCode).toBe(403);
    });
});

describe("requireInternalApiKey", () => {
    const configuredKey = env.internal.apiKey;

    afterEach(() => {
        env.internal.apiKey = configuredKey;
    });

    it("lets a request with the configured api-key through", () => {
        // Arrange
        const req = mockRequest({headers: {"api-key": configuredKey}});
        const next = mockNext();

        // Act
        requireInternalApiKey(req, mockResponse(), next);

        // Assert
        expect(next).toHaveBeenCalled();
    });

    it("answers 401 for a wrong or missing api-key", () => {
        // Arrange
        const wrong = mockResponse();
        const missing = mockResponse();
        const next = mockNext();

        // Act
        requireInternalApiKey(mockRequest({headers: {"api-key": "nope"}}), wrong, next);
        requireInternalApiKey(mockRequest({headers: {}}), missing, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect([wrong.sentStatus, missing.sentStatus]).toEqual([401, 401]);
        expect(wrong.sentBody).toEqual({error: "Invalid api key"});
    });

    it("fails closed with 500 when no internal key is configured", () => {
        // Arrange
        env.internal.apiKey = "";
        const res = mockResponse();
        const next = mockNext();

        // Act
        requireInternalApiKey(mockRequest({headers: {"api-key": ""}}), res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.sentStatus).toBe(500);
        expect(res.sentBody).toEqual({error: "Internal api key not configured"});
    });
});
