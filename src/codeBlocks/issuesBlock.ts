import type CommandPlugin from "../main";
import { renderIssueRow } from "../rendering";
import { renderIssueRowActions } from "../rowActionRenderers";
import { queryIssuesForBlock, resolveIssuesContext } from "./blockQueries";
import { registerCommandCodeBlock } from "./renderCommandBlock";

export function registerIssuesCodeBlock(plugin: CommandPlugin): void {
	registerCommandCodeBlock(plugin, {
		language: "ninety-issues",
		resourceLabel: "Issues",
		emptyText: "No open Issues.",
		renderRow: renderIssueRow,
		resolveContext: resolveIssuesContext,
		fetch: queryIssuesForBlock,
		renderActions: renderIssueRowActions,
	});
}
