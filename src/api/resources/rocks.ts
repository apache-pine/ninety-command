import type { NinetyApiClient } from "../client";
import type {
	AscDescSortDirection,
	PaginatedResponse,
	RockFutureScope,
	RockLevelCode,
	RockQuarter,
	RockStatusCode,
} from "../types";
import type { MilestoneResponseDTO } from "./milestones";

export type RockSortField =
	| "title"
	| "statusCode"
	| "dueDate"
	| "completedDate"
	| "owner"
	| "team"
	| "dueDateQuarter";

export interface RockResponseDTO {
	_id: string;
	userId: string;
	teamId: string;
	companyId: string;
	title: string;
	description?: string;
	archived: boolean;
	deleted: boolean;
	completed: boolean;
	dueDate: string;
	originalDueDate?: string;
	statusCode: RockStatusCode;
	levelCode: RockLevelCode;
	quarter: RockQuarter;
	futureScope?: RockFutureScope;
	createdBy?: string;
	createdDate?: string;
	updatedAt?: string;
	updatedBy?: string;
	archivedDate?: string;
	completedDate?: string;
	createdByUserId?: string;
	ordinal?: number;
	userOrdinal?: number;
	planningBoardOrdinal?: number;
	comments?: unknown[];
	attachments?: unknown[];
	followers?: string[];
	additionalTeamIds?: string[];
	rockQuarterYearDueDate?: string;
	dueDateQuarter?: string;
	milestones?: MilestoneResponseDTO[];
}

export interface GetRocksQueryDTO {
	sortField: RockSortField;
	sortDirection: AscDescSortDirection;
	/** Max 200. */
	pageSize: number;
	/** 0-based. */
	pageIndex: number;
	teamId?: string;
	userId?: string;
	statusCode?: RockStatusCode;
	levelCode?: RockLevelCode;
	futureScope?: RockFutureScope;
	archived?: boolean;
	searchText?: string;
	includeRockGoals?: boolean;
	/** Comma-separated list, alternative to userId. */
	userIds?: string;
}

/** Response is keyed by teamId; a Rock on multiple teams repeats under each key. Deprecated — prefer queryPaged. */
export type QueryRocksResponseDTO = Record<string, RockResponseDTO[]>;

export interface GetRocksPageQueryDTO {
	sortField?: RockSortField;
	sortDirection?: AscDescSortDirection;
	/** Max 200. */
	pageSize?: number;
	/** 0-based, max 1000. */
	pageIndex?: number;
	teamId?: string;
	userId?: string;
	statusCode?: RockStatusCode;
	levelCode?: RockLevelCode;
	futureScope?: RockFutureScope;
	archived?: boolean;
	searchText?: string;
	includeRockGoals?: boolean;
	userIds?: string;
}

export type PaginatedRocksResponseDTO = PaginatedResponse<RockResponseDTO>;

export interface CreateRockDataDTO {
	teamId: string;
	title: string;
	/** ISO 8601. */
	dueDate: string;
	statusCode: RockStatusCode;
	levelCode: RockLevelCode;
	quarter: RockQuarter;
	description?: string;
	additionalTeamIds?: string[];
	futureScope?: RockFutureScope;
	rockQuarterYearDueDate?: string;
}

export interface CreateRockDTO {
	rock: CreateRockDataDTO;
	addCreatorToFollowersList?: boolean;
}

export interface UpdateRockDTO {
	userId?: string;
	teamId?: string;
	title?: string;
	description?: string;
	statusCode?: RockStatusCode;
	levelCode?: RockLevelCode;
	quarter?: RockQuarter;
	dueDate?: string;
	rockQuarterYearDueDate?: string;
	archived?: boolean;
	futureScope?: RockFutureScope;
	additionalTeamIds?: string[];
}

export interface RocksResource {
	/** @deprecated Not deduped, no total. Prefer queryPaged. */
	query(params: GetRocksQueryDTO): Promise<QueryRocksResponseDTO>;
	queryPaged(params: GetRocksPageQueryDTO): Promise<PaginatedRocksResponseDTO>;
	get(id: string): Promise<RockResponseDTO>;
	update(id: string, data: UpdateRockDTO): Promise<RockResponseDTO>;
	/** Soft-delete. Returns the deleted Rock (HTTP 200, unlike Issues/To-Dos deletes). */
	delete(id: string): Promise<RockResponseDTO>;
	/** Owner/companyId are derived from the JWT. Response is an array containing the created Rock. */
	create(data: CreateRockDTO): Promise<RockResponseDTO[]>;
}

export function createRocksResource(client: NinetyApiClient): RocksResource {
	return {
		query: (params) =>
			client.request<QueryRocksResponseDTO>({
				method: "POST",
				path: "/rocks/query",
				body: params,
			}),
		queryPaged: (params) =>
			client.request<PaginatedRocksResponseDTO>({
				method: "POST",
				path: "/rocks/query/paged",
				body: params,
			}),
		get: (id) => client.request<RockResponseDTO>({ method: "GET", path: `/rocks/${id}` }),
		update: (id, data) =>
			client.request<RockResponseDTO>({ method: "PATCH", path: `/rocks/${id}`, body: data }),
		delete: (id) =>
			client.request<RockResponseDTO>({ method: "DELETE", path: `/rocks/${id}` }),
		create: (data) =>
			client.request<RockResponseDTO[]>({ method: "POST", path: "/rocks", body: data }),
	};
}
