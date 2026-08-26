import { type App, Platform } from "obsidian";
import type CommandPlugin from "../main";

/**
 * Opens a create/edit item form as a pop-out window when the user has that
 * turned on and the desktop app supports it (openPopoutLeaf is desktop-only),
 * otherwise falls back to the given modal opener.
 */
export function openItemFormWindow(
	app: App,
	plugin: CommandPlugin,
	viewType: string,
	state: Record<string, unknown>,
	openAsModal: () => void,
): void {
	if (!Platform.isDesktopApp || !plugin.settings.openFormsAsPopout) {
		openAsModal();
		return;
	}

	const leaf = app.workspace.openPopoutLeaf({ size: { width: 480, height: 640 } });
	void leaf.setViewState({ type: viewType, active: true, state });
}
