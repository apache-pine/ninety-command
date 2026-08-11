import type CommandPlugin from "../main";
import { renderRockRow } from "../rendering";
import { renderRockRowActions } from "../rowActionRenderers";
import { queryRocksForBlock, resolveRocksContext } from "./blockQueries";
import { registerCommandCodeBlock } from "./renderCommandBlock";

export function registerRocksCodeBlock(plugin: CommandPlugin): void {
	registerCommandCodeBlock(plugin, {
		language: "ninety-rocks",
		resourceLabel: "Rocks",
		emptyText: "No active Rocks.",
		renderRow: renderRockRow,
		resolveContext: resolveRocksContext,
		fetch: queryRocksForBlock,
		renderActions: renderRockRowActions,
	});
}
