import { Notice, Setting } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type { RockResponseDTO } from "../api/resources/rocks";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { RockLevelCode, RockQuarter, RockStatusCode } from "../api/types";
import type { CompanyUserResponseDTO } from "../api/resources/users";
import { ensureTeamsCache, ensureUsersCache } from "../cache";
import type CommandPlugin from "../main";
import { dateInputToEndOfDayUtcIso, getCalendarQuarter } from "../utils/dates";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, addTeamDropdown, addUserDropdown, runSubmit, widenField } from "./formHelpers";

export type RockModalMode = { mode: "create"; prefill: CapturePrefill } | { mode: "edit"; rock: RockResponseDTO };

const STATUS_OPTIONS: { value: RockStatusCode; label: string }[] = [
	{ value: "ON_TRACK", label: "On track" },
	{ value: "OFF_TRACK", label: "Off track" },
	{ value: "DONE", label: "Done" },
	{ value: "CANCELED", label: "Canceled" },
	{ value: "DRAFT", label: "Draft" },
];

const LEVEL_OPTIONS: { value: RockLevelCode; label: string }[] = [
	{ value: "USER", label: "Individual" },
	{ value: "COMPANY_AND_DEPARTMENT", label: "Company & department" },
	{ value: "COMPANY", label: "Company" },
	{ value: "DEPARTMENT", label: "Department" },
];

const QUARTER_OPTIONS: RockQuarter[] = ["Q1", "Q2", "Q3", "Q4", "None"];

function toDateInputValue(dueDate: string): string {
	return dueDate.slice(0, 10);
}

/**
 * Holds the Create/Edit Rock form's state and rendering logic, independent
 * of whether it's hosted in a Modal or an ItemView. `close` is called on
 * successful submit — the host decides what that means.
 */
export class RockFormController {
	readonly isEdit: boolean;
	private title: string;
	private description: string;
	private teamId: string;
	private dueDate: string;
	private statusCode: RockStatusCode;
	private levelCode: RockLevelCode;
	private quarter: RockQuarter;
	private userId = "";

	constructor(
		private plugin: CommandPlugin,
		private modeOpts: RockModalMode,
		private onSaved: (() => void) | undefined,
		private close: () => void,
	) {
		this.isEdit = modeOpts.mode === "edit";
		if (modeOpts.mode === "create") {
			this.title = modeOpts.prefill.title;
			this.description = modeOpts.prefill.description;
			this.teamId = "";
			this.dueDate = "";
			this.statusCode = "ON_TRACK";
			this.levelCode = "USER";
			this.quarter = getCalendarQuarter();
		} else {
			this.title = modeOpts.rock.title;
			this.description = modeOpts.rock.description ?? "";
			this.teamId = modeOpts.rock.teamId;
			this.dueDate = toDateInputValue(modeOpts.rock.dueDate);
			this.statusCode = modeOpts.rock.statusCode;
			this.levelCode = modeOpts.rock.levelCode;
			this.quarter = modeOpts.rock.quarter;
			this.userId = modeOpts.rock.userId;
		}
	}

	async mount(contentEl: HTMLElement): Promise<void> {
		const isEdit = this.isEdit;
		contentEl.createEl("h2", { text: isEdit ? "Edit Rock" : "Create Rock" });
		const loadingEl = contentEl.createEl("p", { text: "Loading teams…", cls: "ninety-command-modal-loading" });

		try {
			// Only edit mode shows an Owner dropdown (create derives the owner from the
			// JWT), so only edit mode needs the users cache warmed.
			const [teams, users] = await Promise.all([
				ensureTeamsCache(this.plugin),
				isEdit ? ensureUsersCache(this.plugin) : Promise.resolve(this.plugin.settings.usersCache),
			]);
			loadingEl.remove();
			this.renderForm(contentEl, teams, users);
		} catch (err) {
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load teams.";
			loadingEl.setText(message);
		}
	}

	private renderForm(contentEl: HTMLElement, teams: AvailableTeamResponseDTO[], users: CompanyUserResponseDTO[]): void {
		const isEdit = this.isEdit;

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

		addTeamDropdown(
			new Setting(contentEl).setName("Team"),
			teams,
			{ defaultTeamId: isEdit ? this.teamId : this.plugin.settings.defaultTeamId },
			(teamId) => {
				this.teamId = teamId;
			},
		);

		addDateField(new Setting(contentEl).setName("Due date"), this.dueDate, (value) => {
			this.dueDate = value;
		});

		new Setting(contentEl).setName("Status").addDropdown((dropdown) => {
			for (const opt of STATUS_OPTIONS) dropdown.addOption(opt.value, opt.label);
			dropdown.setValue(this.statusCode).onChange((value) => {
				this.statusCode = value as RockStatusCode;
			});
		});

		new Setting(contentEl).setName("Level").addDropdown((dropdown) => {
			for (const opt of LEVEL_OPTIONS) dropdown.addOption(opt.value, opt.label);
			dropdown.setValue(this.levelCode).onChange((value) => {
				this.levelCode = value as RockLevelCode;
			});
		});

		new Setting(contentEl)
			.setName("Quarter")
			.setDesc("Best guess from today's date — check against your company's fiscal calendar.")
			.addDropdown((dropdown) => {
				for (const q of QUARTER_OPTIONS) dropdown.addOption(q, q);
				dropdown.setValue(this.quarter).onChange((value) => {
					this.quarter = value as RockQuarter;
				});
			});

		// Only meaningful in edit mode — on create, the owner is always the
		// authenticated user, derived server-side from the JWT.
		if (isEdit) {
			addUserDropdown(
				new Setting(contentEl).setName("Owner"),
				users,
				(userId) => {
					this.userId = userId;
				},
				this.userId,
			);
		}

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText(isEdit ? "Save Changes" : "Create Rock")
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
					if (!this.dueDate) {
						new Notice("Ninety Command: select a due date.");
						return;
					}

					void runSubmit(btn, isEdit ? "Saving…" : "Creating…", async () => {
						if (this.modeOpts.mode === "edit") {
							const updated = await this.plugin.apiClient.rocks.update(this.modeOpts.rock._id, {
								title: this.title.trim(),
								teamId: this.teamId,
								dueDate: dateInputToEndOfDayUtcIso(this.dueDate),
								statusCode: this.statusCode,
								levelCode: this.levelCode,
								quarter: this.quarter,
								description: this.description || undefined,
								userId: this.userId || undefined,
							});
							new Notice(`Ninety Command: Rock "${updated.title}" updated.`);
							this.onSaved?.();
							this.close();
							return;
						}

						const created = await this.plugin.apiClient.rocks.create({
							rock: {
								teamId: this.teamId,
								title: this.title.trim(),
								dueDate: dateInputToEndOfDayUtcIso(this.dueDate),
								statusCode: this.statusCode,
								levelCode: this.levelCode,
								quarter: this.quarter,
								description: this.description || undefined,
							},
							addCreatorToFollowersList: true,
						});

						const rock = created[0];
						if (!rock) {
							new Notice("Ninety Command: Rock created, but the response was empty — check Ninety.io to confirm.");
							this.close();
							return;
						}

						new Notice(`Ninety Command: Rock "${rock.title}" created.`);
						this.onSaved?.();
						this.close();
					});
				});
		});
	}
}
