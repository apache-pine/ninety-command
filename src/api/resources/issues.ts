import type { CommandApiClient } from "../client";
import type { AscDescSortDirection, IssueInterval, PaginatedResponse } from "../types";

export interface IssueResponseDTO {
	/** Despite the swagger doc calling this `id`, the live API actually returns `_id`. */
	_id: string;
	userId: string;
	teamId: string;
	companyId: string;
	archived: boolean;
	archivedDate?: string;
	completed: boolean;
	completedDate?: string;
	createdBy: string;
	deleted: boolean;
	/** Raw HTML from Ninety's rich text editor — not Markdown or plaintext. */
	description?: string;
	intervalCode: IssueInterval;
	priority?: number;
	title: string;
	createdDate: string;
}

export interface GetIssuesQueryDTO {
	sortField?: string;
	sortDirection?: AscDescSortDirection;
	pageSize?: number;
	pageIndex?: number;
	/** Single team Id or comma-separated list. Omit to query all teams. */
	teamId?: string;
	intervalCode?: IssueInterval;
	searchText?: string;
}

export type PaginatedIssuesResponseDTO = PaginatedResponse<IssueResponseDTO>;

export interface CreatePublicIssueDTO {
	title: string;
	teamId: string;
	/** Defaults to SHORT_TERM if not provided. */
	interval?: IssueInterval;
	/** Raw HTML. */
	description?: string;
	/** 0 (none) to 5 (highest). */
	priority?: number;
	/** Defaults to the authenticated user. Must be a user in the same company. */
	userId?: string;
}

export interface UpdateIssueDTO {
	title?: string;
	teamId?: string;
	interval?: IssueInterval;
	description?: string;
	priority?: number;
	completed?: boolean;
}

export interface IssuesResource {
	query(params: GetIssuesQueryDTO): Promise<PaginatedIssuesResponseDTO>;
	get(issueId: string): Promise<IssueResponseDTO>;
	update(issueId: string, data: UpdateIssueDTO): Promise<IssueResponseDTO>;
	delete(issueId: string): Promise<void>;
	create(data: CreatePublicIssueDTO): Promise<IssueResponseDTO>;
}

export function createIssuesResource(client: CommandApiClient): IssuesResource {
	return {
		query: (params) =>
			client.request<PaginatedIssuesResponseDTO>({
				method: "POST",
				path: "/issues/query",
				body: params,
			}),
		get: (issueId) =>
			client.request<IssueResponseDTO>({ method: "GET", path: `/issues/${issueId}` }),
		update: (issueId, data) =>
			client.request<IssueResponseDTO>({
				method: "PATCH",
				path: `/issues/${issueId}`,
				body: data,
			}),
		delete: (issueId) =>
			client.request<void>({
				method: "DELETE",
				path: `/issues/${issueId}`,
				expectBody: false,
			}),
		create: (data) =>
			client.request<IssueResponseDTO>({ method: "POST", path: "/issues", body: data }),
	};
}
