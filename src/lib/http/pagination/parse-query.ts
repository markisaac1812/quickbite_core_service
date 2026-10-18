import {PaginationParams, FilterParams} from "./cursor-pagination";

export function parsePaginationQuery(query : Record<string, any>): PaginationParams {
        return {
            cursor: query.cursor as string,
            limit: Math.min(1000, Number(query.limit)),
            sortBy: query.sortBy as string,
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