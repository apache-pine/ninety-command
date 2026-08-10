import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { CompanyUserResponseDTO } from "../api/resources/users";

export interface NinetySettings {
	/** Personal Access Token, stored in plaintext in data.json (an Obsidian community-plugin limitation). */
	apiToken: string;
	defaultTeamId: string | null;
	/** Cached label so the dropdown can render without a refetch. */
	defaultTeamName: string | null;
	teamsCache: AvailableTeamResponseDTO[];
	usersCache: CompanyUserResponseDTO[];
	/** ISO timestamp of the last successful cache refresh, or null if never refreshed. */
	cacheLastUpdated: string | null;
	/** Minutes between automatic sidebar-panel refreshes; 0 disables auto-refresh. */
	autoRefreshMinutes: number;
}

export const DEFAULT_SETTINGS: NinetySettings = {
	apiToken: "",
	defaultTeamId: null,
	defaultTeamName: null,
	teamsCache: [],
	usersCache: [],
	cacheLastUpdated: null,
	autoRefreshMinutes: 0,
};
