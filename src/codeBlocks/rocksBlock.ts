import type CommandPlugin from "../main";
import { renderRockRow } from "../rendering";
import { renderRockRowActions } from "../rowActionRenderers";
import { getPrefillFromSelection } from "../utils/prefill";
import { openRockForm } from "../views/RockFormView";
import { queryRocksForBlock, resolveRocksContext } from "./blockQueries";
import { registerCommandCodeBlock } from "./renderCommandBlock";

export function registerRocksCodeBlock(plugin: CommandPlugin): void {
	registerCommandCodeBlock(plugin, {
		language: "ninety-rocks",
		resourceLabel: "Rocks",
		emptyText: "No active Rocks.",
		renderRow: renderRockRow,
		getDescription: (item) => item.description,
		resolveContext: resolveRocksContext,
		fetch: queryRocksForBlock,
		renderActions: renderRockRowActions,
		addButtonLabel: "Add Rock",
		onAddClick: (plugin, onCreated) => {
			openRockForm(plugin.app, plugin, { mode: "create", prefill: getPrefillFromSelection(plugin.app) }, onCreated);
		},
	});
}
