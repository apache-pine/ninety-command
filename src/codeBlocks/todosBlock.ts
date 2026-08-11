import type NinetyPlugin from "../main";
import { renderTodoRow } from "../rendering";
import { renderTodoRowActions } from "../rowActionRenderers";
import { queryTodosForBlock, resolveTodosContext } from "./blockQueries";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

export function registerTodosCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-todos",
		resourceLabel: "To-Dos",
		emptyText: "No open To-Dos.",
		renderRow: renderTodoRow,
		resolveContext: resolveTodosContext,
		fetch: queryTodosForBlock,
		renderActions: renderTodoRowActions,
	});
}
