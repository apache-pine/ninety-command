import { type App, Modal } from "obsidian";
import type CommandPlugin from "../main";
import { TodoFormController, type TodoModalMode } from "./TodoFormController";

export type { TodoModalMode };

export class CreateTodoModal extends Modal {
	private controller: TodoFormController;

	constructor(app: App, plugin: CommandPlugin, modeOpts: TodoModalMode, onSaved?: () => void) {
		super(app);
		this.controller = new TodoFormController(plugin, modeOpts, onSaved, () => this.close());
	}

	async onOpen(): Promise<void> {
		await this.controller.mount(this.contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
