import { type App, Modal } from "obsidian";
import type CommandPlugin from "../main";
import { IssueFormController, type IssueModalMode } from "./IssueFormController";

export type { IssueModalMode };

export class CreateIssueModal extends Modal {
	private controller: IssueFormController;

	constructor(app: App, plugin: CommandPlugin, modeOpts: IssueModalMode, onSaved?: () => void) {
		super(app);
		this.controller = new IssueFormController(plugin, modeOpts, onSaved, () => this.close());
	}

	async onOpen(): Promise<void> {
		await this.controller.mount(this.contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
