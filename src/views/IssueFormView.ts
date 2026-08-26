import { type App, type IconName, ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type CommandPlugin from "../main";
import { CreateIssueModal } from "../modals/CreateIssueModal";
import { IssueFormController, type IssueModalMode } from "../modals/IssueFormController";
import { openItemFormWindow } from "./formPopout";

export const ISSUE_FORM_VIEW_TYPE = "ninety-command-issue-form";

interface IssueFormViewState {
	modeOpts: IssueModalMode;
	onSaved?: () => void;
}

function isIssueFormViewState(state: unknown): state is IssueFormViewState {
	return typeof state === "object" && state !== null && "modeOpts" in state;
}

/**
 * Same Create/Edit Issue form as {@link CreateIssueModal}, hosted as a pane
 * instead of a modal so it can live in its own pop-out window.
 */
export class IssueFormView extends ItemView {
	private plugin: CommandPlugin;
	private controller: IssueFormController | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CommandPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return ISSUE_FORM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.controller?.isEdit ? "Edit Issue" : "Create Issue";
	}

	getIcon(): IconName {
		return "alert-circle";
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (isIssueFormViewState(state)) {
			this.contentEl.empty();
			this.controller = new IssueFormController(this.plugin, state.modeOpts, state.onSaved, () => this.leaf.detach());
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

/** Opens the Create/Edit Issue form, as a pop-out window or a modal per the user's setting. */
export function openIssueForm(app: App, plugin: CommandPlugin, modeOpts: IssueModalMode, onSaved?: () => void): void {
	const state: IssueFormViewState = { modeOpts, onSaved };
	openItemFormWindow(app, plugin, ISSUE_FORM_VIEW_TYPE, state as unknown as Record<string, unknown>, () =>
		new CreateIssueModal(app, plugin, modeOpts, onSaved).open(),
	);
}
