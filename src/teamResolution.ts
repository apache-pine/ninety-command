import type { AvailableTeamResponseDTO } from "./api/resources/teams";
import { ensureTeamsCache } from "./cache";
import type CommandPlugin from "./main";

export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export interface ResolvedTeam {
	teamId: string;
	teamName: string;
}

export interface ResolvedTeamList {
	teamIds: string[];
	displayLabel: string;
}

/**
 * Matches one name-or-id segment against a cached team list.
 *   1. Case-insensitive exact name match.
 *   2. Otherwise, if it looks like a 24-hex-char team id, treated as a
 *      literal id (name looked up from cache if present).
 *   3. Otherwise → null (unresolved).
 */
export function matchTeamSegment(teams: AvailableTeamResponseDTO[], segment: string): ResolvedTeam | null {
	const trimmed = segment.trim();

	const byName = teams.find((team) => team.name.toLowerCase() === trimmed.toLowerCase());
	if (byName) {
		return { teamId: byName._id, teamName: byName.name };
	}

	if (OBJECT_ID_PATTERN.test(trimmed)) {
		const byId = teams.find((team) => team._id === trimmed);
		return { teamId: trimmed, teamName: byId?.name ?? trimmed };
	}

	return null;
}

/**
 * Resolves a code block's optional `team:` param to a team id + display name.
 *   1. No param → the configured default team.
 *   2. Param given → matched via matchTeamSegment against the cached team
 *      list (lazily populated if empty).
 *   3. Otherwise → null (unresolved).
 * CommandApiError from a lazy cache fetch propagates to the caller — "can't
 * even list teams" and "team name not found" are different failure modes.
 */
export async function resolveTeamParam(plugin: CommandPlugin, teamParam?: string): Promise<ResolvedTeam | null> {
	const trimmed = teamParam?.trim();

	if (!trimmed) {
		const { defaultTeamId, defaultTeamName } = plugin.settings;
		return defaultTeamId ? { teamId: defaultTeamId, teamName: defaultTeamName ?? defaultTeamId } : null;
	}

	const teams = await ensureTeamsCache(plugin);
	return matchTeamSegment(teams, trimmed);
}

/**
 * Resolves a code block's `team:` param that may name multiple teams
 * (comma-separated) — for Issues only, the one resource whose teamId field
 * documents comma-separated multi-team support. No param delegates to
 * resolveTeamParam and wraps the single result. Fails all-or-nothing: if any
 * segment doesn't match, the whole param is treated as unresolved (a typo in
 * a 2-team list shouldn't silently drop to 1 team).
 */
export async function resolveTeamListParam(plugin: CommandPlugin, teamParam?: string): Promise<ResolvedTeamList | null> {
	const trimmed = teamParam?.trim();

	if (!trimmed) {
		const single = await resolveTeamParam(plugin, undefined);
		return single ? { teamIds: [single.teamId], displayLabel: single.teamName } : null;
	}

	if (!trimmed.includes(",")) {
		const single = await resolveTeamParam(plugin, trimmed);
		return single ? { teamIds: [single.teamId], displayLabel: single.teamName } : null;
	}

	const teams = await ensureTeamsCache(plugin);
	const segments = trimmed
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const resolved: ResolvedTeam[] = [];
	for (const segment of segments) {
		const match = matchTeamSegment(teams, segment);
		if (!match) return null;
		resolved.push(match);
	}

	if (resolved.length === 0) return null;

	const displayLabel =
		resolved.length === 1 ? resolved[0].teamName : `${resolved[0].teamName} & ${resolved.length - 1} more`;

	return { teamIds: resolved.map((r) => r.teamId), displayLabel };
}
