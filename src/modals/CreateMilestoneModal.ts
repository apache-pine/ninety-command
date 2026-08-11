import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type { RockResponseDTO } from "../api/resources/rocks";
import { ensureTeamsCache } from "../cache";
import type CommandPlugin from "../main";
import { dateInputToEndOfDayUtcIso } from "../utils/dates";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, runSubmit } from "./formHelpers";

export class CreateMilestoneModal extends Modal {
	private title: string;
	private description: string;
	private dueDate = "";

	constructor(
		app: App,
		private plugin: CommandPlugin,
		private rock: RockResponseDTO,
		prefill: CapturePrefill,
	) {
		super(app);
		this.title = prefill.title;
		this.description = prefill.description;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Add Milestone" });
		const loadingEl = contentEl.createEl("p", { text: "Loading…", cls: "ninety-command-modal-loading" });

		try {
			const teams = await ensureTeamsCache(this.plugin);
			const teamName = teams.find((t) => t._id === this.rock.teamId)?.name ?? "Unknown team";
			loadingEl.remove();
			this.renderForm(teamName);
		} catch (err) {
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load.";
			loadingEl.setText(message);
		}
	}

	private renderForm(teamName: string): void {
		const { contentEl } = this;

		new Setting(contentEl).setName("Rock").setDesc(this.rock.title);
		new Setting(contentEl).setName("Team").setDesc(teamName);

		new Setting(contentEl).setName("Title").addText((text) =>
			text.setValue(this.title).onChange((value) => {
				this.title = value;
			}),
		);

		new Setting(contentEl).setName("Description").addTextArea((text) =>
			text.setValue(this.description).onChange((value) => {
				this.description = value;
			}),
		);

		addDateField(new Setting(contentEl).setName("Due date"), this.dueDate, (value) => {
			this.dueDate = value;
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Add Milestone")
				.setCta()
				.onClick(() => {
					if (!this.title.trim()) {
						new Notice("Ninety Command: enter a title.");
						return;
					}
					if (!this.dueDate) {
						new Notice("Ninety Command: select a due date.");
						return;
					}

					void runSubmit(btn, "Adding…", async () => {
						const created = await this.plugin.apiClient.milestones.create({
							rockId: this.rock._id,
							teamId: this.rock.teamId,
							title: this.title.trim(),
							description: this.description || undefined,
							dueDate: dateInputToEndOfDayUtcIso(this.dueDate),
						});
						new Notice(`Ninety Command: Milestone "${created.title}" added to "${this.rock.title}".`);
						this.close();
					});
				});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
