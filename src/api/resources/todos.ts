import type { NinetyApiClient } from "../client";
import type { AscDescSortDirectionLower, PaginatedResponse } from "../types";

export interface TodoResponseDTO {
	id: string;
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
	updatedDate: string;
}

export interface CreateTodoDTO {
	title: string;
	description?: string;
	/** YYYY-MM-DD. */
	dueDate?: string;
	/** Omit or pass an empty string for a personal To-Do. */
	teamId?: string;
	/** e.g. "weekly", "monthly". */
	repeat?: string;
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
	repeat?: string;
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

export function createTodosResource(client: NinetyApiClient): TodosResource {
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
