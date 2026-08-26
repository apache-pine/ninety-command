import type CommandPlugin from "../main";
import { renderTodoRow } from "../rendering";
import { renderTodoRowActions } from "../rowActionRenderers";
import { getPrefillFromSelection } from "../utils/prefill";
import { openTodoForm } from "../views/TodoFormView";
import { queryTodosForBlock, resolveTodosContext } from "./blockQueries";
import { registerCommandCodeBlock } from "./renderCommandBlock";

export function registerTodosCodeBlock(plugin: CommandPlugin): void {
	registerCommandCodeBlock(plugin, {
		language: "ninety-todos",
		resourceLabel: "To-Dos",
		emptyText: "No open To-Dos.",
		renderRow: renderTodoRow,
		resolveContext: resolveTodosContext,
		fetch: queryTodosForBlock,
		renderActions: renderTodoRowActions,
		addButtonLabel: "Add To-Do",
		onAddClick: (plugin, onCreated, defaultAssigneeUserId) => {
			openTodoForm(
				plugin.app,
				plugin,
				{ mode: "create", prefill: getPrefillFromSelection(plugin.app), defaultUserId: defaultAssigneeUserId },
				onCreated,
			);
		},
	});
}
