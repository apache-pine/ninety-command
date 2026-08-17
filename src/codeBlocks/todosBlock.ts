import type CommandPlugin from "../main";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { renderTodoRow } from "../rendering";
import { renderTodoRowActions } from "../rowActionRenderers";
import { getPrefillFromSelection } from "../utils/prefill";
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
		onAddClick: (plugin, onCreated) => {
			new CreateTodoModal(plugin.app, plugin, { mode: "create", prefill: getPrefillFromSelection(plugin.app) }, onCreated).open();
		},
	});
}
