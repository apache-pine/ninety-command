import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "../api/errors";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { IssueInterval } from "../api/types";
import type { CompanyUserResponseDTO } from "../api/resources/users";
import { ensureTeamsCache, ensureUsersCache } from "../cache";
import type NinetyPlugin from "../main";
import type { CapturePrefill } from "../utils/prefill";
import { addTeamDropdown, addUserDropdown, runSubmit } from "./formHelpers";

export class CreateIssueModal extends Modal {
	private title: string;
	private description: string;
	private interval: IssueInterval = "SHORT_TERM";
	private priority = 0;
	private teamId = "";
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
		contentEl.createEl("h2", { text: "Create Ninety Issue" });
		const loadingEl = contentEl.createEl("p", { text: "Loading teams…", cls: "ninety-modal-loading" });

		try {
			const [teams] = await Promise.all([ensureTeamsCache(this.plugin), ensureUsersCache(this.plugin)]);
			const users = this.plugin.settings.usersCache;
			loadingEl.remove();
			this.renderForm(teams, users);
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
			{ defaultTeamId: this.plugin.settings.defaultTeamId },
			(teamId) => {
				this.teamId = teamId;
			},
		);

		addUserDropdown(new Setting(contentEl).setName("Assignee"), users, (userId) => {
			this.userId = userId;
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Create Issue")
				.setCta()
				.onClick(() => {
					if (!this.title.trim()) {
						new Notice("Ninety.io: enter a title.");
						return;
					}
					if (!this.teamId) {
						new Notice("Ninety.io: select a team.");
						return;
					}

					void runSubmit(btn, "Creating…", async () => {
						const created = await this.plugin.apiClient.issues.create({
							title: this.title.trim(),
							teamId: this.teamId,
							interval: this.interval,
							description: this.description ? this.description.split("\n").join("<br>\n") : undefined,
							priority: this.priority,
							userId: this.userId || undefined,
						});
						new Notice(`Ninety.io: Issue "${created.title}" created.`);
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
