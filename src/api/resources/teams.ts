import type { CommandApiClient } from "../client";

export interface TeamResponseDTO {
	_id: string;
	name: string;
}

export interface AvailableTeamResponseDTO {
	_id: string;
	name: string;
	/** False means the Team is visible only because the user is an Owner/Admin/Implementer. */
	isMember: boolean;
}

export interface TeamsResource {
	/** Teams the authenticated user belongs to. Used for the Test Connection check. */
	list(): Promise<TeamResponseDTO[]>;
	/** Every team the user may pick when creating/querying work. Preferred for team pickers. */
	available(): Promise<AvailableTeamResponseDTO[]>;
}

export function createTeamsResource(client: CommandApiClient): TeamsResource {
	return {
		list: () => client.request<TeamResponseDTO[]>({ method: "GET", path: "/teams" }),
		available: () =>
			client.request<AvailableTeamResponseDTO[]>({ method: "GET", path: "/teams/available" }),
	};
}
