import type { NinetyApiClient } from "./api/client";
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
	apiClient: NinetyApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
	intervalCode?: IssueInterval,
): Promise<QueryResult<IssueResponseDTO>> {
	const page = await apiClient.issues.query({
		teamId,
		intervalCode,
		sortField: "createdDate",
		sortDirection: "DESC",
		pageSize: 50,
	});

	// No server-side completed/archived filter on this endpoint — filter client-side.
	const open = page.items.filter((issue) => !issue.completed && !issue.archived);
	return {
		items: open.slice(0, limit),
		// Heuristic, not exact: filtering happens after a single raw page, so a team
		// with many closed Issues could have open ones this page never surfaces.
		moreAvailable: open.length > limit || page.totalCount > page.items.length,
	};
}

export async function queryOpenTodos(
	apiClient: NinetyApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
): Promise<QueryResult<TodoResponseDTO>> {
	const page = await apiClient.todos.queryPaged({
		teamId,
		completed: false,
		archived: false,
		sort: "dueDate",
		order: "asc",
		page: 1,
		pageSize: limit,
	});

	return { items: page.items, moreAvailable: page.totalCount > page.items.length };
}

export async function queryActiveRocks(
	apiClient: NinetyApiClient,
	teamId: string,
	limit: number = SECTION_DISPLAY_LIMIT,
): Promise<QueryResult<RockResponseDTO>> {
	const page = await apiClient.rocks.queryPaged({
		teamId,
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
