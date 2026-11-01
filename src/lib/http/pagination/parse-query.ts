import {PaginationParams, FilterParams} from "./cursor-pagination";

const DEFAULT_SORT_BY = 'createdAt';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

export function parsePaginationQuery(query: Record<string, any>, allowedSortBy: string[] = ['createdAt']): PaginationParams {
    const sortBy = allowedSortBy.includes(query.sortBy as string)
        ? (query.sortBy as string)
        : DEFAULT_SORT_BY;

    // A missing / non-numeric / non-positive limit used to become NaN, which
    // knex silently drops (no LIMIT at all) and which made hasMore always false.
    const parsedLimit = Math.floor(Number(query.limit));
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(MAX_LIMIT, parsedLimit)
        : DEFAULT_LIMIT;

    return {
        cursor: query.cursor as string,
        limit,
        sortBy,
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    }
}

// filter
// GET /api/users?filter[status][eq]=active&filter[age][gte]=25&filter[age][lte]=40&filter[id][in]=1,2,3
// {
//     filter: {
//         age: { gte: '25', lte: '40' },
//         status: { eq: 'active' },
//        id: { in: '1,2,3' }
//     }
// }

export function parseFilters(query: Record<string, any>, allowedFields: string[]): FilterParams[] {
    const filter = query.filter;
    if (!filter || typeof filter !== 'object') return [];

    const allowedOps = new Set(['eq', 'gt', 'lt', 'gte', 'lte', 'like', 'in']);

    return allowedFields.flatMap((field) => {
        const fieldFilters = filter[field];
        if (!fieldFilters || typeof fieldFilters !== 'object') return [];

        return Object.entries(fieldFilters)
            .filter(([op]) => allowedOps.has(op))
            .map(([operator, value]) => ({
                field,
                operator: operator as FilterParams['operator'],
                value: value as string | string[],
            }));
    });
}