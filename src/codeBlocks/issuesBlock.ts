import type NinetyPlugin from "../main";
import { renderIssueRow } from "../rendering";
import { queryIssuesForBlock, resolveIssuesContext } from "./blockQueries";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

export function registerIssuesCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-issues",
		resourceLabel: "Issues",
		emptyText: "No open Issues.",
		renderRow: renderIssueRow,
		resolveContext: resolveIssuesContext,
		fetch: queryIssuesForBlock,
	});
}
