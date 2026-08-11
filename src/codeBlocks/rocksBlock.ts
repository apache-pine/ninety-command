import type NinetyPlugin from "../main";
import { renderRockRow } from "../rendering";
import { renderRockRowActions } from "../rowActionRenderers";
import { queryRocksForBlock, resolveRocksContext } from "./blockQueries";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

export function registerRocksCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-rocks",
		resourceLabel: "Rocks",
		emptyText: "No active Rocks.",
		renderRow: renderRockRow,
		resolveContext: resolveRocksContext,
		fetch: queryRocksForBlock,
		renderActions: renderRockRowActions,
	});
}
