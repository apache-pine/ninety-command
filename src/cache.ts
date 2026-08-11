import type { AvailableTeamResponseDTO } from "./api/resources/teams";
import type { CompanyUserResponseDTO } from "./api/resources/users";
import type CommandPlugin from "./main";

/**
 * Shared team/user cache read-through helpers, used by both the settings tab
 * and the capture modals so there is one place that fetches + persists this data.
 * These throw CommandApiError on failure like the resource layer — no Notice
 * calls here, callers surface errors.
 */

export async function fetchAndCacheTeams(plugin: CommandPlugin): Promise<AvailableTeamResponseDTO[]> {
	const teams = await plugin.apiClient.teams.available();
	plugin.settings.teamsCache = teams;
	await plugin.saveSettings();
	return teams;
}

export async function fetchAndCacheUsers(plugin: CommandPlugin): Promise<CompanyUserResponseDTO[]> {
	const users = await plugin.apiClient.users.listForCompany();
	plugin.settings.usersCache = users;
	await plugin.saveSettings();
	return users;
}

export async function fetchAndCacheAll(
	plugin: CommandPlugin,
): Promise<{ teams: AvailableTeamResponseDTO[]; users: CompanyUserResponseDTO[] }> {
	const [teams, users] = await Promise.all([
		plugin.apiClient.teams.available(),
		plugin.apiClient.users.listForCompany(),
	]);
	plugin.settings.teamsCache = teams;
	plugin.settings.usersCache = users;
	plugin.settings.cacheLastUpdated = new Date().toISOString();
	await plugin.saveSettings();
	return { teams, users };
}

export async function ensureTeamsCache(plugin: CommandPlugin): Promise<AvailableTeamResponseDTO[]> {
	if (plugin.settings.teamsCache.length > 0) {
		return plugin.settings.teamsCache;
	}
	return fetchAndCacheTeams(plugin);
}

export async function ensureUsersCache(plugin: CommandPlugin): Promise<CompanyUserResponseDTO[]> {
	if (plugin.settings.usersCache.length > 0) {
		return plugin.settings.usersCache;
	}
	return fetchAndCacheUsers(plugin);
}
