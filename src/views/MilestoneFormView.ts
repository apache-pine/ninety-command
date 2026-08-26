import { type App, type IconName, ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type { RockResponseDTO } from "../api/resources/rocks";
import type CommandPlugin from "../main";
import { CreateMilestoneModal } from "../modals/CreateMilestoneModal";
import { MilestoneFormController } from "../modals/MilestoneFormController";
import type { CapturePrefill } from "../utils/prefill";
import { openItemFormWindow } from "./formPopout";

export const MILESTONE_FORM_VIEW_TYPE = "ninety-command-milestone-form";

interface MilestoneFormViewState {
	rock: RockResponseDTO;
	prefill: CapturePrefill;
}

function isMilestoneFormViewState(state: unknown): state is MilestoneFormViewState {
	return typeof state === "object" && state !== null && "rock" in state && "prefill" in state;
}

/**
 * Same Add Milestone form as {@link CreateMilestoneModal}, hosted as a pane
 * instead of a modal so it can live in its own pop-out window.
 */
export class MilestoneFormView extends ItemView {
	private plugin: CommandPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: CommandPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return MILESTONE_FORM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Add Milestone";
	}

	getIcon(): IconName {
		return "flag";
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (isMilestoneFormViewState(state)) {
			this.contentEl.empty();
			const controller = new MilestoneFormController(this.plugin, state.rock, state.prefill, () => this.leaf.detach());
			await controller.mount(this.contentEl);
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

/** Opens the Add Milestone form, as a pop-out window or a modal per the user's setting. */
export function openMilestoneForm(app: App, plugin: CommandPlugin, rock: RockResponseDTO, prefill: CapturePrefill): void {
	const state: MilestoneFormViewState = { rock, prefill };
	openItemFormWindow(app, plugin, MILESTONE_FORM_VIEW_TYPE, state as unknown as Record<string, unknown>, () =>
		new CreateMilestoneModal(app, plugin, rock, prefill).open(),
	);
}
