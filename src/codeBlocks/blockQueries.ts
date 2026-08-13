import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO, RockSortField } from "../api/resources/rocks";
import type { TodoResponseDTO } from "../api/resources/todos";
import type { IssueInterval, RockFutureScope, RockLevelCode, RockStatusCode } from "../api/types";
import type CommandPlugin from "../main";
import type { QueryResult } from "../queries";
import { resolveTeamListParam, resolveTeamParam } from "../teamResolution";
import { resolveAssigneeFilterParam } from "../userResolution";
import { normalizeOrderLower, normalizeOrderUpper, parseTriStateBool } from "../utils/blockParams";
import { BlockParamError, teamResolutionFailedMessage } from "./blockErrors";
import type { BlockContext } from "./renderCommandBlock";

/** Scales the raw fetch size with the requested limit, so client-side filtering has enough rows to work with. */
function bufferSize(limit: number, floor: number, cap: number): number {
	return Math.min(Math.max(limit * 5, floor), cap);
}

// ---- Issues ----

export interface IssuesBlockContext extends BlockContext {
	teamIds: string[];
}

function parseIntervalParam(value: string | undefined): IssueInterval | undefined {
	const normalized = value?.trim().toUpperCase();
	return normalized === "SHORT_TERM" || normalized === "LONG_TERM" ? normalized : undefined;
}

/**
 * Issues' sortField is unconstrained free text server-side, but the actual
 * queryable/sortable field is named `rating` (see IssueResponseDTO) even
 * though the create/update body and Ninety's own UI call it "priority" —
 * `sort: priority` is aliased here so users can use the name they actually
 * know, rather than needing to discover the internal `rating` field name.
 */
function resolveIssuesSortField(value: string | undefined): string {
	const trimmed = value?.trim();
	if (!trimmed) return "createdDate";
	return trimmed.toLowerCase() === "priority" ? "rating" : trimmed;
}

function parsePriorityParam(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const n = Number(value.trim());
	return Number.isFinite(n) ? n : undefined;
}

export async function resolveIssuesContext(
	plugin: CommandPlugin,
	params: Record<string, string>,
): Promise<IssuesBlockContext> {
	const resolved = await resolveTeamListParam(plugin, params.team);
	if (!resolved) throw new BlockParamError(teamResolutionFailedMessage(params.team));
	return { label: resolved.displayLabel, teamIds: resolved.teamIds };
}

export async function queryIssuesForBlock(
	plugin: CommandPlugin,
	context: IssuesBlockContext,
	limit: number,
	params: Record<string, string>,
): Promise<QueryResult<IssueResponseDTO>> {
	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);
	const priorityFilter = parsePriorityParam(params.priority);

	const page = await plugin.apiClient.issues.query({
		teamId: context.teamIds.join(","),
		intervalCode: parseIntervalParam(params.interval),
		searchText: params.search || undefined,
		sortField: resolveIssuesSortField(params.sort),
		sortDirection: normalizeOrderUpper(params.order, "DESC"),
		pageSize: bufferSize(limit, 50, 200),
	});

	const completedFilter = parseTriStateBool(params.completed, false);
	const archivedFilter = parseTriStateBool(params.archived, false);

	let filtered = page.items;
	if (completedFilter !== undefined) filtered = filtered.filter((i) => i.completed === completedFilter);
	if (archivedFilter !== undefined) filtered = filtered.filter((i) => i.archived === archivedFilter);
	if (assigneeIds) filtered = filtered.filter((i) => assigneeIds.includes(i.userId));
	if (priorityFilter !== undefined) filtered = filtered.filter((i) => i.rating === priorityFilter);

	return {
		items: filtered.slice(0, limit),
		// Heuristic, not exact — client-side filtering on a single raw page can't be.
		moreAvailable: filtered.length > limit || page.totalCount > page.items.length,
	};
}

// ---- To-Dos ----

export interface TodosBlockContext extends BlockContext {
	teamId: string | null;
}

export async function resolveTodosContext(
	plugin: CommandPlugin,
	params: Record<string, string>,
): Promise<TodosBlockContext> {
	if (parseTriStateBool(params.personal, undefined) === true) {
		return { label: "Personal", teamId: null };
	}

	const resolved = await resolveTeamParam(plugin, params.team);
	if (!resolved) throw new BlockParamError(teamResolutionFailedMessage(params.team));
	return { label: resolved.teamName, teamId: resolved.teamId };
}

export async function queryTodosForBlock(
	plugin: CommandPlugin,
	context: TodosBlockContext,
	limit: number,
	params: Record<string, string>,
): Promise<QueryResult<TodoResponseDTO>> {
	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);
	const isPersonal = parseTriStateBool(params.personal, undefined);
	const completed = parseTriStateBool(params.completed, false);
	const archived = parseTriStateBool(params.archived, false);

	const baseQuery = {
		teamId: context.teamId ?? undefined,
		isPersonal,
		completed,
		archived,
		searchText: params.search || undefined,
		title: params.title || undefined,
		sort: params.sort?.trim() || "dueDate",
		order: normalizeOrderLower(params.order, "asc"),
		page: 1,
	};

	if (assigneeIds) {
		// No server-side assignee filter — over-fetch a buffer, filter, then slice.
		const page = await plugin.apiClient.todos.queryPaged({
			...baseQuery,
			pageSize: bufferSize(limit, 50, 100),
		});
		const filtered = page.items.filter((t) => assigneeIds.includes(t.userId));
		return {
			items: filtered.slice(0, limit),
			moreAvailable: filtered.length > limit || page.totalCount > page.items.length,
		};
	}

	const page = await plugin.apiClient.todos.queryPaged({ ...baseQuery, pageSize: Math.min(limit, 100) });
	return { items: page.items, moreAvailable: page.totalCount > page.items.length };
}

// ---- Rocks ----

export interface RocksBlockContext extends BlockContext {
	teamId: string;
}

const ROCK_SORT_FIELDS: RockSortField[] = [
	"title",
	"statusCode",
	"dueDate",
	"completedDate",
	"owner",
	"team",
	"dueDateQuarter",
];

function parseRockSortField(value: string | undefined): RockSortField {
	const normalized = value?.trim().toLowerCase();
	return ROCK_SORT_FIELDS.find((field) => field.toLowerCase() === normalized) ?? "dueDate";
}

const ROCK_STATUS_CODES: RockStatusCode[] = ["OFF_TRACK", "ON_TRACK", "DONE", "CANCELED", "DRAFT"];

function parseRockStatus(value: string | undefined): RockStatusCode | undefined {
	const normalized = value?.trim().toUpperCase();
	return ROCK_STATUS_CODES.find((status) => status === normalized);
}

const ROCK_LEVEL_CODES: RockLevelCode[] = ["USER", "COMPANY_AND_DEPARTMENT", "COMPANY", "DEPARTMENT"];

function parseRockLevel(value: string | undefined): RockLevelCode | undefined {
	const normalized = value?.trim().toUpperCase();
	return ROCK_LEVEL_CODES.find((level) => level === normalized);
}

const ROCK_FUTURE_SCOPES: RockFutureScope[] = ["Current", "Next", "Later", "Future", "all"];

function parseRockFutureScope(value: string | undefined): RockFutureScope | undefined {
	const normalized = value?.trim().toLowerCase();
	return ROCK_FUTURE_SCOPES.find((scope) => scope.toLowerCase() === normalized);
}

export async function resolveRocksContext(
	plugin: CommandPlugin,
	params: Record<string, string>,
): Promise<RocksBlockContext> {
	const resolved = await resolveTeamParam(plugin, params.team);
	if (!resolved) throw new BlockParamError(teamResolutionFailedMessage(params.team));
	return { label: resolved.teamName, teamId: resolved.teamId };
}

export async function queryRocksForBlock(
	plugin: CommandPlugin,
	context: RocksBlockContext,
	limit: number,
	params: Record<string, string>,
): Promise<QueryResult<RockResponseDTO>> {
	const explicitStatus = parseRockStatus(params.status);
	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);

	const page = await plugin.apiClient.rocks.queryPaged({
		teamId: context.teamId,
		statusCode: explicitStatus,
		levelCode: parseRockLevel(params.level),
		futureScope: parseRockFutureScope(params.futurescope),
		archived: parseTriStateBool(params.archived, false),
		searchText: params.search || undefined,
		sortField: parseRockSortField(params.sort),
		sortDirection: normalizeOrderUpper(params.order, "ASC"),
		includeRockGoals: parseTriStateBool(params.includegoals, undefined),
		// Both single and comma-separated owner params resolve to the same
		// server-native userIds field — a one-element list is equivalent to userId.
		userIds: assigneeIds && assigneeIds.length > 0 ? assigneeIds.join(",") : undefined,
		pageSize: bufferSize(limit, 50, 200),
	});

	// An explicit status request shouldn't be second-guessed; only apply the
	// default "active" filter when the caller didn't ask for a specific one.
	const filtered = explicitStatus
		? page.items
		: page.items.filter((rock) => rock.statusCode !== "DONE" && rock.statusCode !== "CANCELED");

	return {
		items: filtered.slice(0, limit),
		moreAvailable: filtered.length > limit || page.totalCount > page.items.length,
	};
}
