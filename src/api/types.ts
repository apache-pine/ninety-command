/**
 * Cross-cutting primitives shared across resource modules. Resource-specific
 * request/response DTOs are colocated in their own `resources/*.ts` file, not here.
 */

export type RockStatusCode = "OFF_TRACK" | "ON_TRACK" | "DONE" | "CANCELED" | "DRAFT";

export type RockLevelCode = "USER" | "COMPANY_AND_DEPARTMENT" | "COMPANY" | "DEPARTMENT";

export type RockFutureScope = "Current" | "Next" | "Later" | "Future" | "all";

export type RockQuarter = "Q1" | "Q2" | "Q3" | "Q4" | "None";

export type IssueInterval = "SHORT_TERM" | "LONG_TERM";

/** ASC/DESC casing used by Issues and Rocks query endpoints. */
export type AscDescSortDirection = "ASC" | "DESC";

/** asc/desc casing used by the To-Dos query endpoint — kept distinct from AscDescSortDirection. */
export type AscDescSortDirectionLower = "asc" | "desc";

export interface PageQueryBase {
	pageIndex?: number;
	pageSize?: number;
	sortField?: string;
	sortDirection?: AscDescSortDirection;
}

export interface PaginatedResponse<TItem> {
	items: TItem[];
	totalCount: number;
}
