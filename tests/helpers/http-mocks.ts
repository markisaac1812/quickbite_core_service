import type {NextFunction, Request, Response} from "express";

/** Minimal express Response double that records what a middleware/controller sent. */
export interface MockResponse extends Response {
    sentStatus: number;
    sentBody: unknown;
    sentHeaders: Record<string, unknown>;
    sentCookies: Array<{name: string; value: string; options: Record<string, unknown>}>;
}

export function mockResponse(): MockResponse {
    // Built untyped and cast once: express' Response has far more members than a middleware touches.
    const res: Record<string, any> = {
        sentStatus: 200,
        statusCode: 200,
        sentBody: undefined as unknown,
        sentHeaders: {} as Record<string, unknown>,
        sentCookies: [] as MockResponse["sentCookies"],
        status: jest.fn((code: number) => {
            res.sentStatus = code;
            res.statusCode = code;
            return res;
        }),
        json: jest.fn((body: unknown) => {
            res.sentBody = body;
            return res;
        }),
        setHeader: jest.fn((name: string, value: unknown) => {
            res.sentHeaders[name] = value;
            return res;
        }),
        cookie: jest.fn((name: string, value: string, options: Record<string, unknown>) => {
            res.sentCookies.push({name, value, options});
            return res;
        }),
    };
    return res as unknown as MockResponse;
}

export function mockRequest(overrides: Partial<Request> & Record<string, unknown> = {}): Request {
    return {method: "GET", originalUrl: "/api/test", headers: {}, params: {}, query: {}, cookies: {}, body: {}, ...overrides} as unknown as Request;
}

export function mockNext(): jest.MockedFunction<NextFunction> {
    return jest.fn() as unknown as jest.MockedFunction<NextFunction>;
}
