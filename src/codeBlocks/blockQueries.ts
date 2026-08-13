import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO, RockSortField } from "../api/resources/rocks";
import type { TodoRepeat, TodoResponseDTO } from "../api/resources/todos";
import type { IssueInterval, RockFutureScope, RockLevelCode, RockStatusCode } from "../api/types";
import type CommandPlugin from "../main";
import type { QueryResult } from "../queries";
import { resolveTeamListParam, resolveTeamParam } from "../teamResolution";
import { resolveAssigneeFilterParam, resolveUserParam } from "../userResolution";
import { normalizeOrderLower, normalizeOrderUpper, parseTriStateBool } from "../utils/blockParams";
import {
	BlockParamError,
	personalTodosUnsupportedMessage,
	teamResolutionFailedMessage,
	userNotFoundMessage,
} from "./blockErrors";
import type { BlockContext } from "./renderCommandBlock";

/** Scales the raw fetch size with the requested limit, so client-side filtering has enough rows to work with. */
function bufferSize(limit: number, floor: number, cap: number): number {
	return Math.min(Math.max(limit * 5, floor), cap);
}

/**
 * Resolves the `createdby:` param (name, email, or id) to a user id — shared
 * by all three resources. No server-side "created by" filter exists on any
 * of the query endpoints, so this is always applied client-side.
 */
async function resolveCreatedByFilter(plugin: CommandPlugin, params: Record<string, string>): Promise<string | null> {
	const value = params.createdby?.trim();
	if (!value) return null;
	const resolved = await resolveUserParam(plugin, value);
	if (!resolved) throw new BlockParamError(userNotFoundMessage(value));
	return resolved.userId;
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
	if (params.id?.trim()) {
		return { label: "By ID", teamIds: [] };
	}

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
	// Bypasses every other filter — fetches exactly this Issue by id, direct from
	// GET /issues/{id}, regardless of team/completed/archived/etc.
	const id = params.id?.trim();
	if (id) {
		const issue = await plugin.apiClient.issues.get(id);
		return { items: [issue], moreAvailable: false };
	}

	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);
	const priorityFilter = parsePriorityParam(params.priority);
	const createdByUserId = await resolveCreatedByFilter(plugin, params);

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
	if (createdByUserId) filtered = filtered.filter((i) => i.createdByUserId === createdByUserId);

	return {
		items: filtered.slice(0, limit),
		// Heuristic, not exact — client-side filtering on a single raw page can't be.
		moreAvailable: filtered.length > limit || page.totalCount > page.items.length,
	};
}

// ---- To-Dos ----

export interface TodosBlockContext extends BlockContext {
	teamId: string;
}

export async function resolveTodosContext(
	plugin: CommandPlugin,
	params: Record<string, string>,
): Promise<TodosBlockContext> {
	if (params.id?.trim()) {
		// Fetched directly by id — bypasses the list endpoint entirely, so this
		// is also the only way to embed a personal To-Do (see queryTodosForBlock).
		return { label: "By ID", teamId: "" };
	}

	if (parseTriStateBool(params.personal, undefined) === true) {
		// The API has no working way to list personal To-Dos — see personalTodosUnsupportedMessage.
		throw new BlockParamError(personalTodosUnsupportedMessage());
	}

	const resolved = await resolveTeamParam(plugin, params.team);
	if (!resolved) throw new BlockParamError(teamResolutionFailedMessage(params.team));
	return { label: resolved.teamName, teamId: resolved.teamId };
}

/** Forgiving repeat: filter — accepts the real enum values case-insensitively, plus none/off as aliases for "Don't repeat". */
function parseRepeatParam(value: string | undefined): TodoRepeat | undefined {
	const normalized = value?.trim().toLowerCase();
	switch (normalized) {
		case "daily":
			return "Daily";
		case "weekly":
			return "Weekly";
		case "monthly":
			return "Monthly";
		case "quarterly":
			return "Quarterly";
		case "none":
		case "off":
		case "dont_repeat":
		case "don't repeat":
			return "Don't repeat";
		default:
			return undefined;
	}
}

export async function queryTodosForBlock(
	plugin: CommandPlugin,
	context: TodosBlockContext,
	limit: number,
	params: Record<string, string>,
): Promise<QueryResult<TodoResponseDTO>> {
	// Bypasses every other filter, including the personal: true block above —
	// GET /todos/{id} works fine for personal To-Dos even though the list
	// endpoints can't return them (see personalTodosUnsupportedMessage).
	const id = params.id?.trim();
	if (id) {
		const todo = await plugin.apiClient.todos.get(id);
		return { items: [todo], moreAvailable: false };
	}

	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);
	const createdByUserId = await resolveCreatedByFilter(plugin, params);
	const repeatFilter = parseRepeatParam(params.repeat);
	const completed = parseTriStateBool(params.completed, false);
	const archived = parseTriStateBool(params.archived, false);

	// isPersonal is deliberately never sent here: resolveTodosContext already
	// rejects personal: true before this runs, and live testing showed
	// isPersonal: false has no filtering effect at all — sending it would be
	// dead weight at best.
	const baseQuery = {
		teamId: context.teamId,
		completed,
		archived,
		searchText: params.search || undefined,
		title: params.title || undefined,
		sort: params.sort?.trim() || "dueDate",
		order: normalizeOrderLower(params.order, "asc"),
		page: 1,
	};

	// No server-side assignee/createdBy/repeat filter — over-fetch a buffer when
	// any of those are active, filter client-side, then slice.
	if (assigneeIds || createdByUserId || repeatFilter) {
		const page = await plugin.apiClient.todos.queryPaged({
			...baseQuery,
			pageSize: bufferSize(limit, 50, 100),
		});

		let filtered = page.items;
		if (assigneeIds) filtered = filtered.filter((t) => assigneeIds.includes(t.userId));
		if (createdByUserId) filtered = filtered.filter((t) => t.createdByUserId === createdByUserId);
		if (repeatFilter) filtered = filtered.filter((t) => (t.repeat ?? "Don't repeat") === repeatFilter);

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
	if (params.id?.trim()) {
		return { label: "By ID", teamId: "" };
	}

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
	// Bypasses every other filter — fetches exactly this Rock by id, direct from
	// GET /rocks/{id}, regardless of team/status/level/etc.
	const id = params.id?.trim();
	if (id) {
		const rock = await plugin.apiClient.rocks.get(id);
		return { items: [rock], moreAvailable: false };
	}

	const explicitStatus = parseRockStatus(params.status);
	const assigneeIds = await resolveAssigneeFilterParam(plugin, params);
	const createdByUserId = await resolveCreatedByFilter(plugin, params);

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
	let filtered = explicitStatus
		? page.items
		: page.items.filter((rock) => rock.statusCode !== "DONE" && rock.statusCode !== "CANCELED");
	if (createdByUserId) filtered = filtered.filter((r) => r.createdByUserId === createdByUserId);

	return {
		items: filtered.slice(0, limit),
		moreAvailable: filtered.length > limit || page.totalCount > page.items.length,
	};
}
