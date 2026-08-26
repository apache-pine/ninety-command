import { Notice, Setting } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type { RockResponseDTO } from "../api/resources/rocks";
import { ensureTeamsCache } from "../cache";
import type CommandPlugin from "../main";
import { dateInputToEndOfDayUtcIso } from "../utils/dates";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, runSubmit, widenField } from "./formHelpers";

/**
 * Holds the Add Milestone form's state and rendering logic, independent of
 * whether it's hosted in a Modal or an ItemView. `close` is called on
 * successful submit — the host decides what that means.
 */
export class MilestoneFormController {
	private title: string;
	private description: string;
	private dueDate = "";

	constructor(
		private plugin: CommandPlugin,
		private rock: RockResponseDTO,
		prefill: CapturePrefill,
		private close: () => void,
	) {
		this.title = prefill.title;
		this.description = prefill.description;
	}

	async mount(contentEl: HTMLElement): Promise<void> {
		contentEl.createEl("h2", { text: "Add Milestone" });
		const loadingEl = contentEl.createEl("p", { text: "Loading…", cls: "ninety-command-modal-loading" });

		try {
			const teams = await ensureTeamsCache(this.plugin);
			const teamName = teams.find((t) => t._id === this.rock.teamId)?.name ?? "Unknown team";
			loadingEl.remove();
			this.renderForm(contentEl, teamName);
		} catch (err) {
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load.";
			loadingEl.setText(message);
		}
	}

	private renderForm(contentEl: HTMLElement, teamName: string): void {
		new Setting(contentEl).setName("Rock").setDesc(this.rock.title);
		new Setting(contentEl).setName("Team").setDesc(teamName);

		widenField(
			new Setting(contentEl).setName("Title").addText((text) =>
				text.setValue(this.title).onChange((value) => {
					this.title = value;
				}),
			),
		);

		widenField(
			new Setting(contentEl).setName("Description").addTextArea((text) =>
				text.setValue(this.description).onChange((value) => {
					this.description = value;
				}),
			),
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
}
