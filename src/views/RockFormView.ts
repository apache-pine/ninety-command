import { type App, type IconName, ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type CommandPlugin from "../main";
import { CreateRockModal } from "../modals/CreateRockModal";
import { RockFormController, type RockModalMode } from "../modals/RockFormController";
import { openItemFormWindow } from "./formPopout";

export const ROCK_FORM_VIEW_TYPE = "ninety-command-rock-form";

interface RockFormViewState {
	modeOpts: RockModalMode;
	onSaved?: () => void;
}

function isRockFormViewState(state: unknown): state is RockFormViewState {
	return typeof state === "object" && state !== null && "modeOpts" in state;
}

/**
 * Same Create/Edit Rock form as {@link CreateRockModal}, hosted as a pane
 * instead of a modal so it can live in its own pop-out window.
 */
export class RockFormView extends ItemView {
	private plugin: CommandPlugin;
	private controller: RockFormController | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CommandPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return ROCK_FORM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.controller?.isEdit ? "Edit Rock" : "Create Rock";
	}

	getIcon(): IconName {
		return "mountain-snow";
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (isRockFormViewState(state)) {
			this.contentEl.empty();
			this.controller = new RockFormController(this.plugin, state.modeOpts, state.onSaved, () => this.leaf.detach());
			await this.controller.mount(this.contentEl);
		}
		await super.setState(state, result);
	}

	getState(): Record<string, unknown> {
		return {};
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}

/** Opens the Create/Edit Rock form, as a pop-out window or a modal per the user's setting. */
export function openRockForm(app: App, plugin: CommandPlugin, modeOpts: RockModalMode, onSaved?: () => void): void {
	const state: RockFormViewState = { modeOpts, onSaved };
	openItemFormWindow(app, plugin, ROCK_FORM_VIEW_TYPE, state as unknown as Record<string, unknown>, () =>
		new CreateRockModal(app, plugin, modeOpts, onSaved).open(),
	);
}
