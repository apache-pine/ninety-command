import type NinetyPlugin from "../main";
import { queryActiveRocks } from "../queries";
import { renderRockRow } from "../rendering";
import { registerNinetyCodeBlock } from "./renderNinetyBlock";

export function registerRocksCodeBlock(plugin: NinetyPlugin): void {
	registerNinetyCodeBlock(plugin, {
		language: "ninety-rocks",
		resourceLabel: "Rocks",
		emptyText: "No active Rocks.",
		renderRow: renderRockRow,
		fetch: (apiClient, teamId, limit) => queryActiveRocks(apiClient, teamId, limit),
	});
}
