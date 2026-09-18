import type CommandPlugin from "../main";
import { renderIssueRow } from "../rendering";
import { renderIssueRowActions } from "../rowActionRenderers";
import { getPrefillFromSelection } from "../utils/prefill";
import { openIssueForm } from "../views/IssueFormView";
import { queryIssuesForBlock, resolveIssuesContext } from "./blockQueries";
import { registerCommandCodeBlock } from "./renderCommandBlock";

export function registerIssuesCodeBlock(plugin: CommandPlugin): void {
	registerCommandCodeBlock(plugin, {
		language: "ninety-issues",
		resourceLabel: "Issues",
		emptyText: "No open Issues.",
		renderRow: renderIssueRow,
		getDescription: (item) => item.description,
		resolveContext: resolveIssuesContext,
		fetch: queryIssuesForBlock,
		renderActions: renderIssueRowActions,
		addButtonLabel: "Add Issue",
		onAddClick: (plugin, onCreated, defaultAssigneeUserId) => {
			openIssueForm(
				plugin.app,
				plugin,
				{ mode: "create", prefill: getPrefillFromSelection(plugin.app), defaultUserId: defaultAssigneeUserId },
				onCreated,
			);
		},
	});
}
