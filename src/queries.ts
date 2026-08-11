import type { CommandApiClient } from "./api/client";
import type { IssueResponseDTO } from "./api/resources/issues";
import type { RockResponseDTO } from "./api/resources/rocks";
import type { TodoResponseDTO } from "./api/resources/todos";
import type { IssueInterval } from "./api/types";

/** Shared default row count for the sidebar panel and code-block embeds. */
export const SECTION_DISPLAY_LIMIT = 10;

export interface QueryResult<T> {
	items: T[];
	/** True when the server has more matching items than were fetched/shown. */
	moreAvailable: boolean;
}

export async function queryOpenIssues(
	apiClient: CommandApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
	intervalCode?: IssueInterval,
	assigneeUserId?: string,
): Promise<QueryResult<IssueResponseDTO>> {
	const page = await apiClient.issues.query({
		teamId,
		intervalCode,
		sortField: "createdDate",
		sortDirection: "DESC",
		// No server-side assignee filter — over-fetch a bit more when filtering client-side.
		pageSize: assigneeUserId ? 100 : 50,
	});

	// No server-side completed/archived filter on this endpoint — filter client-side.
	let open = page.items.filter((issue) => !issue.completed && !issue.archived);
	if (assigneeUserId) {
		open = open.filter((issue) => issue.userId === assigneeUserId);
	}
	return {
		items: open.slice(0, limit),
		// Heuristic, not exact: filtering happens after a single raw page, so a team
		// with many closed Issues could have open ones this page never surfaces.
		moreAvailable: open.length > limit || page.totalCount > page.items.length,
	};
}

export async function queryOpenTodos(
	apiClient: CommandApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
	assigneeUserId?: string,
): Promise<QueryResult<TodoResponseDTO>> {
	// No server-side assignee filter — over-fetch a bit more when filtering client-side.
	const page = await apiClient.todos.queryPaged({
		teamId,
		completed: false,
		archived: false,
		sort: "dueDate",
		order: "asc",
		page: 1,
		pageSize: assigneeUserId ? Math.min(Math.max(limit * 5, 50), 100) : limit,
	});

	const items = assigneeUserId ? page.items.filter((todo) => todo.userId === assigneeUserId) : page.items;
	return {
		items: items.slice(0, limit),
		moreAvailable: items.length > limit || page.totalCount > page.items.length,
	};
}

export async function queryActiveRocks(
	apiClient: CommandApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
	assigneeUserId?: string,
): Promise<QueryResult<RockResponseDTO>> {
	const page = await apiClient.rocks.queryPaged({
		teamId,
		userId: assigneeUserId,
		archived: false,
		pageSize: 50,
		sortField: "dueDate",
		sortDirection: "ASC",
	});

	// No "not completed" filter on this endpoint — filter client-side by status.
	const active = page.items.filter((rock) => rock.statusCode !== "DONE" && rock.statusCode !== "CANCELED");
	return {
		items: active.slice(0, limit),
		moreAvailable: active.length > limit || page.totalCount > page.items.length,
	};
}
