import type { CommandApiClient } from "../client";

export interface MilestoneResponseDTO {
	_id: string;
	companyId: string;
	rockId: string;
	teamId: string;
	ownedByUserId: string;
	title: string;
	description?: string;
	dueDate: string;
	isDone: boolean;
	isDeleted: boolean;
	completedDate?: string;
	userOrdinal?: number;
	followers?: string[];
	createdBy: string;
	createdDate: string;
	updatedAt?: string;
	toDoId?: string;
}

export interface CreateMilestoneDTO {
	rockId: string;
	title: string;
	dueDate: string;
	teamId: string;
	description?: string;
	userOrdinal?: number;
	toDoId?: string;
	isDone?: boolean;
	/** Required when isDone is true. */
	completedDate?: string;
}

export interface UpdateMilestoneDTO {
	title?: string;
	description?: string;
	dueDate?: string;
	isDone?: boolean;
	ownedByUserId?: string;
	completedDate?: string;
	followers?: string[];
}

export interface MilestonesResource {
	get(id: string): Promise<MilestoneResponseDTO>;
	update(id: string, data: UpdateMilestoneDTO): Promise<MilestoneResponseDTO>;
	create(data: CreateMilestoneDTO): Promise<MilestoneResponseDTO>;
}

export function createMilestonesResource(client: CommandApiClient): MilestonesResource {
	return {
		get: (id) => client.request<MilestoneResponseDTO>({ method: "GET", path: `/milestones/${id}` }),
		update: (id, data) =>
			client.request<MilestoneResponseDTO>({
				method: "PATCH",
				path: `/milestones/${id}`,
				body: data,
			}),
		create: (data) =>
			client.request<MilestoneResponseDTO>({ method: "POST", path: "/milestones", body: data }),
	};
}
