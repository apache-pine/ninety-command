import type NinetyPlugin from "../main";
import { queryOpenTodos } from "../queries";
import { renderTodoRow } from "../rendering";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

export function registerTodosCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-todos",
		resourceLabel: "To-Dos",
		emptyText: "No open To-Dos.",
		renderRow: renderTodoRow,
		fetch: (apiClient, teamId, limit) => queryOpenTodos(apiClient, teamId, limit),
	});
}
