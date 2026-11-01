import knex, {Knex} from "knex";
import {parseFilters, parsePaginationQuery} from "../../../src/lib/http/pagination/parse-query";
import {applyCursorPagination, applyFilters, buildPaginationResult} from "../../../src/lib/http/pagination/cursor-pagination";

// Query builder only — no connection is ever opened; we inspect toSQL().
const qb: Knex = knex({client: "pg"});

afterAll(async () => {
    await qb.destroy();
});

describe("parsePaginationQuery", () => {
    it("honours an allow-listed sortBy, desc order, cursor and limit", () => {
        // Arrange
        const query = {limit: "25", sortBy: "name", sortOrder: "desc", cursor: "Koshary"};

        // Act
        const params = parsePaginationQuery(query, ["createdAt", "name"]);

        // Assert
        expect(params).toEqual({cursor: "Koshary", limit: 25, sortBy: "name", sortOrder: "desc"});
    });

    it("caps the limit at 1000", () => {
        // Arrange
        const query = {limit: "5000"};

        // Act
        const params = parsePaginationQuery(query);

        // Assert
        expect(params.limit).toBe(1000);
    });

    it("defaults the limit to 20 when it is missing, non-numeric or not positive", () => {
        // Arrange
        const queries = [{}, {limit: "abc"}, {limit: "-5"}, {limit: "0"}];

        // Act
        const limits = queries.map((q) => parsePaginationQuery(q).limit);

        // Assert
        expect(limits).toEqual([20, 20, 20, 20]);
    });

    it("rounds a fractional limit down", () => {
        // Arrange
        const query = {limit: "7.9"};

        // Act
        const params = parsePaginationQuery(query);

        // Assert
        expect(params.limit).toBe(7);
    });

    it("falls back to createdAt / asc for a sortBy that is not allow-listed", () => {
        // Arrange
        const query = {limit: "10", sortBy: "password_hash", sortOrder: "sideways"};

        // Act
        const params = parsePaginationQuery(query, ["createdAt", "name"]);

        // Assert
        expect(params.sortBy).toBe("createdAt");
        expect(params.sortOrder).toBe("asc");
    });
});

describe("parseFilters", () => {
    it("keeps only allow-listed fields and known operators", () => {
        // Arrange
        const query = {filter: {status: {eq: "active", drop_table: "x"}, password_hash: {eq: "1"}, name: {like: "kosh"}}};

        // Act
        const filters = parseFilters(query, ["status", "name"]);

        // Assert
        expect(filters).toEqual([
            {field: "status", operator: "eq", value: "active"},
            {field: "name", operator: "like", value: "kosh"},
        ]);
    });

    it("returns no filters when filter is missing, not an object, or a field value is scalar", () => {
        // Arrange
        const queries = [{limit: "10"}, {filter: "status=active"}, {filter: {status: "active"}}];

        // Act
        const results = queries.map((q) => parseFilters(q, ["status"]));

        // Assert
        expect(results).toEqual([[], [], []]);
    });
});

describe("applyCursorPagination", () => {
    it("seeks below the cursor for desc order and over-fetches by one", () => {
        // Arrange
        const query = qb("restaurants").select("id");
        const params = {cursor: "2026-03-02T00:00:00.000Z", limit: 2, sortBy: "createdAt", sortOrder: "desc" as const};

        // Act
        const {sql, bindings} = applyCursorPagination(query, params).toSQL();

        // Assert
        expect(sql).toBe('select "id" from "restaurants" where "created_at" < ? order by "created_at" desc limit ?');
        expect(bindings).toEqual(["2026-03-02T00:00:00.000Z", 3]);
    });

    it("seeks above the cursor for asc order", () => {
        // Arrange
        const query = qb("restaurants").select("id");
        const params = {cursor: "Koshary", limit: 10, sortBy: "name", sortOrder: "asc" as const};

        // Act
        const {sql, bindings} = applyCursorPagination(query, params).toSQL();

        // Assert
        expect(sql).toBe('select "id" from "restaurants" where "name" > ? order by "name" asc limit ?');
        expect(bindings).toEqual(["Koshary", 11]);
    });

    it("only orders and limits on the first page", () => {
        // Arrange
        const query = qb("restaurants").select("id");

        // Act
        const {sql} = applyCursorPagination(query, {limit: 5, sortBy: "statusUpdatedAt", sortOrder: "asc"}).toSQL();

        // Assert
        expect(sql).toBe('select "id" from "restaurants" order by "status_updated_at" asc limit ?');
    });

    it("leaves the query untouched without a sortBy", () => {
        // Arrange
        const query = qb("restaurants").select("id");

        // Act
        const {sql} = applyCursorPagination(query, {limit: 5, sortBy: "", sortOrder: "asc"}).toSQL();

        // Assert
        expect(sql).toBe('select "id" from "restaurants"');
    });
});

describe("applyFilters", () => {
    it("translates every supported operator into SQL", () => {
        // Arrange
        const query = qb("restaurants").select("id");
        const filters = [
            {field: "status", operator: "eq" as const, value: "active"},
            {field: "id", operator: "gt" as const, value: "1"},
            {field: "id", operator: "lt" as const, value: "90"},
            {field: "id", operator: "gte" as const, value: "2"},
            {field: "id", operator: "lte" as const, value: "80"},
            {field: "name", operator: "like" as const, value: "kosh"},
            {field: "id", operator: "in" as const, value: ["3", "4"]},
            {field: "status", operator: "in" as const, value: "pending"},
        ];

        // Act
        const {sql, bindings} = applyFilters(query, filters).toSQL();

        // Assert
        expect(sql).toBe(
            'select "id" from "restaurants" where "status" = ? and "id" > ? and "id" < ?' +
            ' and "id" >= ? and "id" <= ? and "name" like ? and "id" in (?, ?) and "status" in (?)',
        );
        expect(bindings).toEqual(["active", "1", "90", "2", "80", "%kosh%", "3", "4", "pending"]);
    });
});

describe("buildPaginationResult", () => {
    beforeEach(() => {
        jest.spyOn(console, "log").mockImplementation(() => {}); // the helper logs the last row
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("drops the look-ahead row and cursors on the last row's sort field", () => {
        // Arrange — limit 2, repo fetched limit + 1
        const rows = [{id: 1, name: "A"}, {id: 2, name: "B"}, {id: 3, name: "C"}];

        // Act
        const result = buildPaginationResult(rows, 2, "name");

        // Assert
        expect(result.data.map((r) => r.id)).toEqual([1, 2]);
        expect(result.meta).toEqual({nextCursor: "B", hasMore: true, count: 2});
    });

    it("has no next cursor on the last page", () => {
        // Arrange
        const rows = [{id: 1, name: "A"}];

        // Act
        const result = buildPaginationResult(rows, 2, "name");

        // Assert
        expect(result.meta).toEqual({nextCursor: null, hasMore: false, count: 1});
    });

    it("handles an empty page", () => {
        // Arrange
        const rows: {id: number}[] = [];

        // Act
        const result = buildPaginationResult(rows, 10, "createdAt");

        // Assert
        expect(result).toEqual({data: [], meta: {nextCursor: null, hasMore: false, count: 0}});
    });
});
