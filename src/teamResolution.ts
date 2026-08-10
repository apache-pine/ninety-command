import { ensureTeamsCache } from "./cache";
import type NinetyPlugin from "./main";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export interface ResolvedTeam {
	teamId: string;
	teamName: string;
}

/**
 * Resolves a code block's optional `team:` param to a team id + display name.
 *   1. No param → the configured default team.
 *   2. Param given → case-insensitive exact match against the cached team
 *      list (lazily populated if empty).
 *   3. No name match, but the param looks like a 24-hex-char team id →
 *      treated as a literal id (name looked up from cache if present).
 *   4. Otherwise → null (unresolved).
 * NinetyApiError from a lazy cache fetch propagates to the caller — "can't
 * even list teams" and "team name not found" are different failure modes.
 */
export async function resolveTeamParam(plugin: NinetyPlugin, teamParam?: string): Promise<ResolvedTeam | null> {
	const trimmed = teamParam?.trim();

	if (!trimmed) {
		const { defaultTeamId, defaultTeamName } = plugin.settings;
		return defaultTeamId ? { teamId: defaultTeamId, teamName: defaultTeamName ?? defaultTeamId } : null;
	}

	const teams = await ensureTeamsCache(plugin);
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
