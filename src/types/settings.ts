import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { CompanyUserResponseDTO } from "../api/resources/users";

export interface CommandSettings {
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
	/** Default row count for the sidebar panel and any code block that doesn't set its own `limit:`. */
	defaultItemLimit: number;
	/** Pre-selects the sidebar's assignee filter on open. Doesn't affect code blocks. */
	defaultAssigneeUserId: string | null;
	/** Cached label so the dropdown can render without a refetch. */
	defaultAssigneeUserName: string | null;
	/** Shows a count of rendered items at the top of every code block. */
	showCodeBlockCounts: boolean;
	/** Ask for confirmation before the complete/mark-done row action runs. Off by default — matches prior behavior. */
	confirmOnComplete: boolean;
	/** Ask for confirmation before the delete row action runs. On by default — matches prior (always-confirmed) behavior. */
	confirmOnDelete: boolean;
	/** Shows a header "add item" button on `interactive: true` code blocks. On by default. Doesn't affect the standalone `addbutton:` param, which always shows the button regardless of this setting. */
	showAddButtonInInteractive: boolean;
}

export const DEFAULT_SETTINGS: CommandSettings = {
	apiToken: "",
	defaultTeamId: null,
	defaultTeamName: null,
	teamsCache: [],
	usersCache: [],
	cacheLastUpdated: null,
	autoRefreshMinutes: 0,
	defaultItemLimit: 10,
	defaultAssigneeUserId: null,
	defaultAssigneeUserName: null,
	showCodeBlockCounts: false,
	confirmOnComplete: false,
	confirmOnDelete: true,
	showAddButtonInInteractive: true,
};
