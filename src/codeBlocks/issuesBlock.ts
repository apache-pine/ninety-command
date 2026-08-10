import type { IssueInterval } from "../api/types";
import type NinetyPlugin from "../main";
import { queryOpenIssues } from "../queries";
import { renderIssueRow } from "../rendering";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

function parseIntervalParam(value: string | undefined): IssueInterval | undefined {
	const normalized = value?.trim().toUpperCase();
	return normalized === "SHORT_TERM" || normalized === "LONG_TERM" ? normalized : undefined;
}

export function registerIssuesCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-issues",
		resourceLabel: "Issues",
		emptyText: "No open Issues.",
		renderRow: renderIssueRow,
		fetch: (apiClient, teamId, limit, params) =>
			queryOpenIssues(apiClient, teamId, limit, parseIntervalParam(params.interval)),
	});
}
