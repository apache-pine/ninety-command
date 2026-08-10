import type { NinetyApiClient } from "../client";

export type ScorecardPeriodInterval = "weekly" | "monthly" | "quarterly" | "annual";
export type ScorecardWindow = "default" | "qtd" | "ytd" | "currentQuarter" | "currentYear";
export type KpiUnit = "number" | "percentage" | "yesno" | "time" | "dollar" | "euro" | "pound";
export type KpiCurrency = "USD" | "AUD" | "CAD" | "EUR" | "GBP";

export interface ScorecardPeriodDTO {
	label: string;
	periodStartDate: string;
	isFuture: boolean;
	partialInterval?: boolean;
}

export interface ScorecardScoreDTO {
	label: string;
	periodStartDate: string;
	isFuture: boolean;
	partialInterval?: boolean;
	/** null when no score has been entered for the period. */
	value: number | null;
	goal?: number;
	note?: string;
}

export interface ScorecardKpiDTO {
	id: string;
	title: string;
	unit: KpiUnit;
	/** Only applicable when unit is dollar, euro, or pound. */
	currency?: KpiCurrency;
	ownerName: string;
	defaultGoal?: number;
	average?: number;
	total?: number;
	/** One entry per period, same order as the parent TeamScorecardResponseDTO.periods. */
	scores: ScorecardScoreDTO[];
}

export interface ScorecardGroupDTO {
	id: string;
	name: string;
	kpis: ScorecardKpiDTO[];
}

export interface TeamScorecardResponseDTO {
	id: string;
	name: string;
	periodInterval: ScorecardPeriodInterval;
	teamId: string;
	/** Oldest first. */
	periods: ScorecardPeriodDTO[];
	groups: ScorecardGroupDTO[];
}

export interface GetTeamScorecardQueryDTO {
	teamId: string;
	/** Defaults to weekly. */
	periodInterval?: ScorecardPeriodInterval;
	/** Defaults to default (most recent 13 periods). Ignored when date is supplied. */
	window?: ScorecardWindow;
	/** Returns only the single period containing this calendar date. Mutually exclusive with window. */
	date?: string;
}

export interface GetKpisQueryDTO {
	excludeKpiIds?: string[];
	pageIndex?: number;
	pageSize?: number;
	periodInterval?: ScorecardPeriodInterval;
	searchOwner?: string;
	searchText?: string;
	searchTitle?: string;
	sortField?: "id" | "owner" | "title";
	sortDirection?: "ASC" | "DESC";
	unassignedOnly?: boolean;
	userIds?: string[];
}

export interface KpiQueryItemResponseDTO {
	_id: string;
	currency?: KpiCurrency;
	defaultGoal: number;
	periodInterval: ScorecardPeriodInterval;
	title: string;
	unit: KpiUnit;
	/** null if unassigned. */
	userId: string | null;
	userFullName: string;
	type: "active" | "archived";
	attachmentCount: number;
	isSmart: boolean;
	isUsedInFormula: boolean;
	lastScoreUpdatedAt: string;
	teams: { id: string; name: string }[];
	scorecards: { id: string; name: string; periodInterval: ScorecardPeriodInterval }[];
}

export interface PaginatedKpiResponseDTO {
	currentPage: number;
	items: KpiQueryItemResponseDTO[];
	itemsCount: number;
	totalCount: number;
	totalPages: number;
}

export interface PutScoreDTO {
	value: number;
	periodStartDate: string;
}

export interface ScoreResponseDTO {
	id: string;
	value?: number;
	periodStartDate: string;
}

export interface PutNoteDTO {
	note: string;
	periodStartDate: string;
}

export interface NoteResponseDTO {
	id: string;
	note?: string;
	periodStartDate: string;
}

export interface ScorecardResource {
	getTeamScorecard(params: GetTeamScorecardQueryDTO): Promise<TeamScorecardResponseDTO>;
	queryKpis(params: GetKpisQueryDTO): Promise<PaginatedKpiResponseDTO>;
	/** Creates or overwrites the score for the given period. */
	putScore(kpiId: string, data: PutScoreDTO): Promise<ScoreResponseDTO>;
	/** Creates or overwrites the note for the given period. */
	putNote(kpiId: string, data: PutNoteDTO): Promise<NoteResponseDTO>;
	deleteScore(kpiId: string, periodStartDate: string): Promise<void>;
	deleteNote(kpiId: string, periodStartDate: string): Promise<void>;
}

export function createScorecardResource(client: NinetyApiClient): ScorecardResource {
	return {
		getTeamScorecard: (params) =>
			client.request<TeamScorecardResponseDTO>({
				method: "GET",
				path: "/scorecard/team-scorecard",
				query: {
					teamId: params.teamId,
					periodInterval: params.periodInterval,
					window: params.window,
					date: params.date,
				},
			}),
		queryKpis: (params) =>
			client.request<PaginatedKpiResponseDTO>({ method: "POST", path: "/scorecard/kpis/query", body: params }),
		// The swagger labels these "Put" endpoints, but they're wired as POST.
		putScore: (kpiId, data) =>
			client.request<ScoreResponseDTO>({ method: "POST", path: `/scorecard/kpis/${kpiId}/scores`, body: data }),
		putNote: (kpiId, data) =>
			client.request<NoteResponseDTO>({ method: "POST", path: `/scorecard/kpis/${kpiId}/notes`, body: data }),
		deleteScore: (kpiId, periodStartDate) =>
			client.request<void>({
				method: "DELETE",
				path: `/scorecard/kpis/${kpiId}/scores/${encodeURIComponent(periodStartDate)}`,
				expectBody: false,
			}),
		deleteNote: (kpiId, periodStartDate) =>
			client.request<void>({
				method: "DELETE",
				path: `/scorecard/kpis/${kpiId}/notes/${encodeURIComponent(periodStartDate)}`,
				expectBody: false,
			}),
	};
}
