import { type App, Modal } from "obsidian";
import type { RockResponseDTO } from "../api/resources/rocks";
import type CommandPlugin from "../main";
import type { CapturePrefill } from "../utils/prefill";
import { MilestoneFormController } from "./MilestoneFormController";

export class CreateMilestoneModal extends Modal {
	private controller: MilestoneFormController;

	constructor(app: App, plugin: CommandPlugin, rock: RockResponseDTO, prefill: CapturePrefill) {
		super(app);
		this.controller = new MilestoneFormController(plugin, rock, prefill, () => this.close());
	}

	async onOpen(): Promise<void> {
		await this.controller.mount(this.contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
