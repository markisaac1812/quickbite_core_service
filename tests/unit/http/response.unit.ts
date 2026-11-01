import {sendPaginated, sendSuccess} from "../../../src/lib/http/response";
import {setAuthCookies} from "../../../src/lib/utils/cookies";
import {toMs, toSeconds} from "../../../src/pkg/utils/time";
import {mockResponse} from "../../helpers/http-mocks";

describe("sendSuccess", () => {
    it("wraps the payload in the success envelope with the given status", () => {
        // Arrange
        const res = mockResponse();

        // Act
        sendSuccess(res, {id: 1}, 201);

        // Assert
        expect(res.sentStatus).toBe(201);
        expect(res.sentBody).toEqual({success: true, data: {id: 1}});
    });

    it("defaults to 200 and attaches meta when given", () => {
        // Arrange
        const res = mockResponse();

        // Act
        sendSuccess(res, [1, 2], undefined, {count: 2});

        // Assert
        expect(res.sentStatus).toBe(200);
        expect(res.sentBody).toEqual({success: true, data: [1, 2], meta: {count: 2}});
    });
});

describe("sendPaginated", () => {
    it("sends the page and its meta exactly once", () => {
        // Arrange
        const res = mockResponse();
        const meta = {nextCursor: 3, hasMore: true, count: 2};

        // Act
        sendPaginated(res, [{id: 1}, {id: 2}], meta);

        // Assert
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.sentStatus).toBe(200);
        expect(res.sentBody).toEqual({success: true, data: [{id: 1}, {id: 2}], meta});
    });
});

describe("setAuthCookies", () => {
    it("sets an httpOnly access cookie and a refresh cookie scoped to the refresh route", () => {
        // Arrange
        const res = mockResponse();

        // Act
        setAuthCookies(res, "access-jwt", "refresh-jwt");

        // Assert
        expect(res.sentCookies).toEqual([
            {name: "access_token", value: "access-jwt", options: {httpOnly: true, secure: false, maxAge: 3_600_000, path: "/"}},
            {name: "refresh_token", value: "refresh-jwt", options: {httpOnly: true, secure: false, maxAge: 604_800_000, path: "/api/auth/refresh"}},
        ]);
    });
});

describe("time helpers", () => {
    it("converts every unit to milliseconds", () => {
        // Arrange
        const inputs: Array<[number, "s" | "m" | "h" | "d"]> = [[2, "s"], [3, "m"], [1, "h"], [1, "d"]];

        // Act
        const ms = inputs.map(([value, unit]) => toMs(value, unit));

        // Assert
        expect(ms).toEqual([2000, 180_000, 3_600_000, 86_400_000]);
    });

    it("converts to seconds", () => {
        // Arrange
        const oneDay = toSeconds(1, "d");

        // Act
        const tenMinutes = toSeconds(10, "m");

        // Assert
        expect([oneDay, tenMinutes]).toEqual([86_400, 600]);
    });
});
