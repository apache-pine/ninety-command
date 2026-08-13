import type { CommandApiClient } from "../client";
import type { AscDescSortDirectionLower, PaginatedResponse } from "../types";

/**
 * The only values the API actually accepts — confirmed by probing it directly
 * (anything else, e.g. "Yearly" or "Every Monday", is rejected with a 400).
 * Not documented as an enum in the swagger, which described it as free text.
 */
export type TodoRepeat = "Don't repeat" | "Daily" | "Weekly" | "Monthly" | "Quarterly";

export interface TodoResponseDTO {
	/** Despite the swagger doc calling this `id`, the live API actually returns `_id`. */
	_id: string;
	title: string;
	description?: string;
	dueDate?: string;
	isPersonal: boolean;
	completed: boolean;
	archived: boolean;
	teamId?: string;
	teamName?: string;
	userId: string;
	companyId: string;
	createdDate: string;
	/** Not actually present on live API responses despite the swagger doc; treat as absent. */
	updatedDate?: string;
	/** Present on every live response (confirmed), despite not being in the swagger doc at all. */
	repeat?: TodoRepeat;
	/** The creator's user id — distinct from `userId`, which is the assignee. */
	createdByUserId?: string;
}

export interface CreateTodoDTO {
	title: string;
	description?: string;
	/** YYYY-MM-DD. */
	dueDate?: string;
	/** Omit or pass an empty string for a personal To-Do. */
	teamId?: string;
	repeat?: TodoRepeat;
	/** Defaults to the authenticated user. */
	userId?: string;
}

export interface UpdateTodoDTO {
	completed?: boolean;
	archived?: boolean;
	dueDate?: string;
	teamId?: string;
	title?: string;
	description?: string;
	repeat?: TodoRepeat;
	userId?: string;
}

export interface GetTodosQueryDTO {
	teamId?: string;
	sort?: string;
	order?: AscDescSortDirectionLower;
	/** 1-based. */
	page?: number;
	/** Max 100. */
	pageSize?: number;
	isPersonal?: boolean;
	completed?: boolean;
	archived?: boolean;
	searchText?: string;
	title?: string;
}

export type PaginatedTodosResponseDTO = PaginatedResponse<TodoResponseDTO>;

export interface TodosResource {
	create(data: CreateTodoDTO): Promise<TodoResponseDTO>;
	query(params: GetTodosQueryDTO): Promise<TodoResponseDTO[]>;
	queryPaged(params: GetTodosQueryDTO): Promise<PaginatedTodosResponseDTO>;
	get(id: string): Promise<TodoResponseDTO>;
	update(id: string, data: UpdateTodoDTO): Promise<TodoResponseDTO>;
	delete(id: string): Promise<void>;
}

export function createTodosResource(client: CommandApiClient): TodosResource {
	return {
		create: (data) =>
			client.request<TodoResponseDTO>({ method: "POST", path: "/todos", body: data }),
		query: (params) =>
			client.request<TodoResponseDTO[]>({ method: "POST", path: "/todos/query", body: params }),
		queryPaged: (params) =>
			client.request<PaginatedTodosResponseDTO>({
				method: "POST",
				path: "/todos/query/paged",
				body: params,
			}),
		get: (id) => client.request<TodoResponseDTO>({ method: "GET", path: `/todos/${id}` }),
		update: (id, data) =>
			client.request<TodoResponseDTO>({ method: "PATCH", path: `/todos/${id}`, body: data }),
		delete: (id) =>
			client.request<void>({ method: "DELETE", path: `/todos/${id}`, expectBody: false }),
	};
}
