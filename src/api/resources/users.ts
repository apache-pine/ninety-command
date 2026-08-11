import type { CommandApiClient } from "../client";

export interface CompanyUserResponseDTO {
	id: string;
	primaryEmail?: string;
	firstName?: string;
	lastName?: string;
	/** Deactivated users are only included when includeInactive is requested. */
	active: boolean;
}

export interface UserResponseDTO {
	id: string;
	primaryEmail?: string;
	firstName?: string;
	lastName?: string;
}

export interface UsersResource {
	/** Every active user in the company (or including inactive, if requested). */
	listForCompany(includeInactive?: boolean): Promise<CompanyUserResponseDTO[]>;
	listForTeam(teamId: string): Promise<UserResponseDTO[]>;
	get(id: string): Promise<UserResponseDTO>;
}

export function createUsersResource(client: CommandApiClient): UsersResource {
	return {
		listForCompany: (includeInactive) =>
			client.request<CompanyUserResponseDTO[]>({
				method: "GET",
				path: "/users",
				query: includeInactive === undefined ? undefined : { includeInactive },
			}),
		listForTeam: (teamId) =>
			client.request<UserResponseDTO[]>({ method: "GET", path: `/users/team/${teamId}` }),
		get: (id) => client.request<UserResponseDTO>({ method: "GET", path: `/users/${id}` }),
	};
}
