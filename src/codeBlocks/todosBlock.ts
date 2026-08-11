import type CommandPlugin from "../main";
import { renderTodoRow } from "../rendering";
import { renderTodoRowActions } from "../rowActionRenderers";
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
	});
}
