import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "../api/errors";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { CompanyUserResponseDTO } from "../api/resources/users";
import { ensureTeamsCache, ensureUsersCache } from "../cache";
import type NinetyPlugin from "../main";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, addTeamDropdown, addUserDropdown, runSubmit } from "./formHelpers";

export class CreateTodoModal extends Modal {
	private title: string;
	private description: string;
	private dueDate = "";
	private teamId = "";
	private repeat = "";
	private userId = "";

	constructor(
		app: App,
		private plugin: NinetyPlugin,
		prefill: CapturePrefill,
		private onCreated?: () => void,
	) {
		super(app);
		this.title = prefill.title;
		this.description = prefill.description;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Create Ninety To-Do" });
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
			{ defaultTeamId: this.plugin.settings.defaultTeamId, allowPersonal: true },
			(teamId) => {
				this.teamId = teamId;
			},
		);

		new Setting(contentEl)
			.setName("Repeat")
			.setDesc("e.g. weekly, monthly. Leave blank for a one-off To-Do.")
			.addText((text) =>
				text.setValue(this.repeat).onChange((value) => {
					this.repeat = value;
				}),
			);

		addUserDropdown(new Setting(contentEl).setName("Assignee"), users, (userId) => {
			this.userId = userId;
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Create To-Do")
				.setCta()
				.onClick(() => {
					if (!this.title.trim()) {
						new Notice("Ninety.io: enter a title.");
						return;
					}

					void runSubmit(btn, "Creating…", async () => {
						const created = await this.plugin.apiClient.todos.create({
							title: this.title.trim(),
							description: this.description || undefined,
							dueDate: this.dueDate || undefined,
							teamId: this.teamId || undefined,
							repeat: this.repeat || undefined,
							userId: this.userId || undefined,
						});
						new Notice(`Ninety.io: To-Do "${created.title}" created.`);
						this.onCreated?.();
						this.close();
					});
				});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
