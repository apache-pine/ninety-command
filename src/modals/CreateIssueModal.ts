import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type { IssueResponseDTO } from "../api/resources/issues";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { IssueInterval } from "../api/types";
import type { CompanyUserResponseDTO } from "../api/resources/users";
import { ensureTeamsCache, ensureUsersCache } from "../cache";
import type CommandPlugin from "../main";
import { htmlDescriptionToEditable } from "../utils/html";
import type { CapturePrefill } from "../utils/prefill";
import { addTeamDropdown, addUserDropdown, runSubmit } from "./formHelpers";

export type IssueModalMode = { mode: "create"; prefill: CapturePrefill } | { mode: "edit"; issue: IssueResponseDTO };

export class CreateIssueModal extends Modal {
	private title: string;
	private description: string;
	private interval: IssueInterval = "SHORT_TERM";
	private priority = 0;
	private teamId = "";
	private userId = "";

	constructor(
		app: App,
		private plugin: CommandPlugin,
		private modeOpts: IssueModalMode,
		private onSaved?: () => void,
	) {
		super(app);
		if (modeOpts.mode === "create") {
			this.title = modeOpts.prefill.title;
			this.description = modeOpts.prefill.description;
		} else {
			this.title = modeOpts.issue.title;
			this.description = htmlDescriptionToEditable(modeOpts.issue.description);
			this.interval = modeOpts.issue.intervalCode;
			this.priority = modeOpts.issue.priority ?? 0;
			this.teamId = modeOpts.issue.teamId;
		}
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		const isEdit = this.modeOpts.mode === "edit";
		contentEl.createEl("h2", { text: isEdit ? "Edit Issue" : "Create Issue" });
		const loadingEl = contentEl.createEl("p", { text: "Loading teams…", cls: "ninety-command-modal-loading" });

		try {
			const [teams] = await Promise.all([ensureTeamsCache(this.plugin), ensureUsersCache(this.plugin)]);
			const users = this.plugin.settings.usersCache;
			loadingEl.remove();
			this.renderForm(teams, users);
		} catch (err) {
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load teams.";
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

		const descSetting = new Setting(contentEl).setName("Description");
		if (isEdit) {
			descSetting.setDesc("Shown as-is; complex formatting from ninety.io may not display cleanly here.");
		}
		descSetting.addTextArea((text) =>
			text.setValue(this.description).onChange((value) => {
				this.description = value;
			}),
		);

		new Setting(contentEl).setName("Interval").addDropdown((dropdown) => {
			dropdown
				.addOption("SHORT_TERM", "Short-term")
				.addOption("LONG_TERM", "Long-term")
				.setValue(this.interval)
				.onChange((value) => {
					this.interval = value as IssueInterval;
				});
		});

		new Setting(contentEl).setName("Priority").addDropdown((dropdown) => {
			for (let i = 0; i <= 5; i++) {
				dropdown.addOption(String(i), i === 0 ? "None" : String(i));
			}
			dropdown.setValue(String(this.priority)).onChange((value) => {
				this.priority = Number(value);
			});
		});

		addTeamDropdown(
			new Setting(contentEl).setName("Team"),
			teams,
			{ defaultTeamId: isEdit ? this.teamId : this.plugin.settings.defaultTeamId },
			(teamId) => {
				this.teamId = teamId;
			},
		);

		// The API gives no way to reassign an Issue's owner via update — Assignee
		// only makes sense at creation time.
		if (!isEdit) {
			addUserDropdown(new Setting(contentEl).setName("Assignee"), users, (userId) => {
				this.userId = userId;
			});
		}

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText(isEdit ? "Save Changes" : "Create Issue")
				.setCta()
				.onClick(() => {
					if (!this.title.trim()) {
						new Notice("Ninety Command: enter a title.");
						return;
					}
					if (!this.teamId) {
						new Notice("Ninety Command: select a team.");
						return;
					}

					void runSubmit(btn, isEdit ? "Saving…" : "Creating…", async () => {
						const description = this.description ? this.description.split("\n").join("<br>\n") : undefined;

						if (this.modeOpts.mode === "edit") {
							const updated = await this.plugin.apiClient.issues.update(this.modeOpts.issue._id, {
								title: this.title.trim(),
								teamId: this.teamId,
								interval: this.interval,
								description,
								priority: this.priority,
							});
							new Notice(`Ninety Command: Issue "${updated.title}" updated.`);
						} else {
							const created = await this.plugin.apiClient.issues.create({
								title: this.title.trim(),
								teamId: this.teamId,
								interval: this.interval,
								description,
								priority: this.priority,
								userId: this.userId || undefined,
							});
							new Notice(`Ninety Command: Issue "${created.title}" created.`);
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
