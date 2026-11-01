import {errorHandler} from "../../../src/lib/error/errorHandler";
import {AppError} from "../../../src/lib/error/appError";
import {Logger, logger} from "../../../src/lib/logger/logger";
import {correlationId} from "../../../src/lib/correlation/correlationId";
import {mockNext, mockRequest, mockResponse} from "../../helpers/http-mocks";

describe("errorHandler", () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        logSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("exposes the message and status of an operational AppError", () => {
        // Arrange
        const res = mockResponse();

        // Act
        errorHandler(new AppError("Restaurant not found", 404), mockRequest(), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(404);
        expect(res.sentBody).toEqual({error: "Restaurant not found"});
    });

    it("hides the details of a non-operational error behind a generic 500", () => {
        // Arrange
        const res = mockResponse();
        const crash = new TypeError("Cannot read properties of undefined") as unknown as AppError;

        // Act
        errorHandler(crash, mockRequest({body: {email: "x"}}), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(500);
        expect(res.sentBody).toEqual({error: "Something went wrong"});
        expect(logSpy).toHaveBeenCalledWith("Cannot read properties of undefined", expect.objectContaining({body: {email: "x"}}));
    });

    it("treats an AppError flagged non-operational as a 500", () => {
        // Arrange
        const res = mockResponse();

        // Act
        errorHandler(new AppError("db pool exhausted", 503, false), mockRequest(), res, mockNext());

        // Assert
        expect(res.sentStatus).toBe(500);
    });
});

describe("AppError", () => {
    it("defaults to an operational 500", () => {
        // Arrange
        const err = new AppError("boom");

        // Act
        const {statusCode, isOperational} = err;

        // Assert
        expect([statusCode, isOperational]).toEqual([500, true]);
        expect(err).toBeInstanceOf(Error);
        expect(err.stack).toBeDefined();
    });
});

describe("Logger", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("is a singleton", () => {
        // Arrange
        const another = new Logger();

        // Act
        const same = another === logger;

        // Assert
        expect(same).toBe(true);
    });

    it("writes one JSON line per call with level, message and metadata", () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        // Act
        logger.info("started", {port: 3000});
        logger.warn("slow");
        logger.error("failed", {id: 1});
        logger.debug("detail");

        // Assert
        const lines = consoleSpy.mock.calls.map(([line]) => JSON.parse(line as string));
        expect(lines.map((l) => [l.level, l.message])).toEqual([["info", "started"], ["warn", "slow"], ["error", "failed"], ["debug", "detail"]]);
        expect(lines[0]).toMatchObject({port: 3000, timestamp: expect.any(Number)});
        expect(lines[2].id).toBe(1);
    });
});

describe("correlationId", () => {
    it("tags the request and the response with a UUID", () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

        // Act
        correlationId(req, res, next);

        // Assert
        expect(req.correlationId).toMatch(uuid);
        expect(res.sentHeaders["X-CorrelationId"]).toMatch(uuid);
        expect(next).toHaveBeenCalled();
    });
});
