import { type App, Modal } from "obsidian";
import type CommandPlugin from "../main";
import { RockFormController, type RockModalMode } from "./RockFormController";

export type { RockModalMode };

export class CreateRockModal extends Modal {
	private controller: RockFormController;

	constructor(app: App, plugin: CommandPlugin, modeOpts: RockModalMode, onSaved?: () => void) {
		super(app);
		this.controller = new RockFormController(plugin, modeOpts, onSaved, () => this.close());
	}

	async onOpen(): Promise<void> {
		await this.controller.mount(this.contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
