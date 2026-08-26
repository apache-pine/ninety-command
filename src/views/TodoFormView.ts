import { type App, type IconName, ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type CommandPlugin from "../main";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { TodoFormController, type TodoModalMode } from "../modals/TodoFormController";
import { openItemFormWindow } from "./formPopout";

export const TODO_FORM_VIEW_TYPE = "ninety-command-todo-form";

interface TodoFormViewState {
	modeOpts: TodoModalMode;
	onSaved?: () => void;
}

function isTodoFormViewState(state: unknown): state is TodoFormViewState {
	return typeof state === "object" && state !== null && "modeOpts" in state;
}

/**
 * Same Create/Edit To-Do form as {@link CreateTodoModal}, hosted as a pane
 * instead of a modal so it can live in its own pop-out window — movable and
 * still visible while the main window keeps focus, for referencing notes
 * while filling in the form.
 */
export class TodoFormView extends ItemView {
	private plugin: CommandPlugin;
	private controller: TodoFormController | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CommandPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TODO_FORM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.controller?.isEdit ? "Edit To-Do" : "Create To-Do";
	}

	getIcon(): IconName {
		return "check-circle";
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (isTodoFormViewState(state)) {
			this.contentEl.empty();
			this.controller = new TodoFormController(this.plugin, state.modeOpts, state.onSaved, () => this.leaf.detach());
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

/** Opens the Create/Edit To-Do form, as a pop-out window or a modal per the user's setting. */
export function openTodoForm(app: App, plugin: CommandPlugin, modeOpts: TodoModalMode, onSaved?: () => void): void {
	const state: TodoFormViewState = { modeOpts, onSaved };
	openItemFormWindow(app, plugin, TODO_FORM_VIEW_TYPE, state as unknown as Record<string, unknown>, () =>
		new CreateTodoModal(app, plugin, modeOpts, onSaved).open(),
	);
}
