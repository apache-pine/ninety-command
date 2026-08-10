import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "../api/errors";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { TodoResponseDTO } from "../api/resources/todos";
import type { CompanyUserResponseDTO } from "../api/resources/users";
import { ensureTeamsCache, ensureUsersCache } from "../cache";
import type NinetyPlugin from "../main";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, addTeamDropdown, addUserDropdown, runSubmit } from "./formHelpers";

export type TodoModalMode = { mode: "create"; prefill: CapturePrefill } | { mode: "edit"; todo: TodoResponseDTO };

function toDateInputValue(dueDate: string | undefined): string {
	if (!dueDate) return "";
	// dueDate comes back as a full ISO datetime; the date input only wants YYYY-MM-DD.
	return dueDate.slice(0, 10);
}

export class CreateTodoModal extends Modal {
	private title: string;
	private description: string;
	private dueDate: string;
	private teamId: string;
	private repeat: string;
	private userId: string;

	constructor(
		app: App,
		private plugin: NinetyPlugin,
		private modeOpts: TodoModalMode,
		private onSaved?: () => void,
	) {
		super(app);
		if (modeOpts.mode === "create") {
			this.title = modeOpts.prefill.title;
			this.description = modeOpts.prefill.description;
			this.dueDate = "";
			this.teamId = "";
			this.repeat = "";
			this.userId = "";
		} else {
			this.title = modeOpts.todo.title;
			this.description = modeOpts.todo.description ?? "";
			this.dueDate = toDateInputValue(modeOpts.todo.dueDate);
			this.teamId = modeOpts.todo.teamId ?? "";
			this.repeat = "";
			this.userId = modeOpts.todo.userId;
		}
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		const isEdit = this.modeOpts.mode === "edit";
		contentEl.createEl("h2", { text: isEdit ? "Edit Ninety To-Do" : "Create Ninety To-Do" });
		const loadingEl = contentEl.createEl("p", { text: "Loading teams…", cls: "ninety-modal-loading" });

		try {
			await Promise.all([ensureTeamsCache(this.plugin), ensureUsersCache(this.plugin)]);
			loadingEl.remove();
			this.renderForm(this.plugin.settings.teamsCache, this.plugin.settings.usersCache);
		} catch (err) {
			const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: failed to load teams.";
			loadingEl.setText(message);
		}
	}

	private renderForm(teams: AvailableTeamResponseDTO[], users: CompanyUserResponseDTO[]): void {
		const { contentEl } = this;
		const isEdit = this.modeOpts.mode === "edit";

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

		addDateField(new Setting(contentEl).setName("Due date").setDesc("Optional."), this.dueDate, (value) => {
			this.dueDate = value;
		});

		addTeamDropdown(
			new Setting(contentEl).setName("Team"),
			teams,
			{ defaultTeamId: isEdit ? this.teamId : this.plugin.settings.defaultTeamId, allowPersonal: true },
			(teamId) => {
				this.teamId = teamId;
			},
		);

		new Setting(contentEl)
			.setName("Repeat")
			.setDesc(
				isEdit
					? "e.g. weekly, monthly. Ninety doesn't report the current pattern back, so this starts blank — leave it blank to keep whatever's set."
					: "e.g. weekly, monthly. Leave blank for a one-off To-Do.",
			)
			.addText((text) =>
				text.setValue(this.repeat).onChange((value) => {
					this.repeat = value;
				}),
			);

		addUserDropdown(
			new Setting(contentEl).setName("Assignee"),
			users,
			(userId) => {
				this.userId = userId;
			},
			isEdit ? this.userId : undefined,
		);

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText(isEdit ? "Save Changes" : "Create To-Do")
				.setCta()
				.onClick(() => {
					if (!this.title.trim()) {
						new Notice("Ninety.io: enter a title.");
						return;
					}

					void runSubmit(btn, isEdit ? "Saving…" : "Creating…", async () => {
						if (this.modeOpts.mode === "edit") {
							const updated = await this.plugin.apiClient.todos.update(this.modeOpts.todo.id, {
								title: this.title.trim(),
								description: this.description || undefined,
								dueDate: this.dueDate || undefined,
								teamId: this.teamId || undefined,
								repeat: this.repeat || undefined,
								userId: this.userId || undefined,
							});
							new Notice(`Ninety.io: To-Do "${updated.title}" updated.`);
						} else {
							const created = await this.plugin.apiClient.todos.create({
								title: this.title.trim(),
								description: this.description || undefined,
								dueDate: this.dueDate || undefined,
								teamId: this.teamId || undefined,
								repeat: this.repeat || undefined,
								userId: this.userId || undefined,
							});
							new Notice(`Ninety.io: To-Do "${created.title}" created.`);
						}
						this.onSaved?.();
						this.close();
					});
				});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
