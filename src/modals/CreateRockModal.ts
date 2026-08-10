import { type App, Modal, Notice, Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "../api/errors";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { RockLevelCode, RockQuarter, RockStatusCode } from "../api/types";
import { ensureTeamsCache } from "../cache";
import type NinetyPlugin from "../main";
import { dateInputToEndOfDayUtcIso, getCalendarQuarter } from "../utils/dates";
import type { CapturePrefill } from "../utils/prefill";
import { addDateField, addTeamDropdown, runSubmit } from "./formHelpers";

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

export class CreateRockModal extends Modal {
	private title: string;
	private description: string;
	private teamId = "";
	private dueDate = "";
	private statusCode: RockStatusCode = "ON_TRACK";
	private levelCode: RockLevelCode = "USER";
	private quarter: RockQuarter = getCalendarQuarter();

	constructor(
		app: App,
		private plugin: NinetyPlugin,
		prefill: CapturePrefill,
	) {
		super(app);
		this.title = prefill.title;
		this.description = prefill.description;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Create Ninety Rock" });
		const loadingEl = contentEl.createEl("p", { text: "Loading teams…", cls: "ninety-modal-loading" });

		try {
			const teams = await ensureTeamsCache(this.plugin);
			loadingEl.remove();
			this.renderForm(teams);
		} catch (err) {
			const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: failed to load teams.";
			loadingEl.setText(message);
		}
	}

	private renderForm(teams: AvailableTeamResponseDTO[]): void {
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

		addTeamDropdown(
			new Setting(contentEl).setName("Team"),
			teams,
			{ defaultTeamId: this.plugin.settings.defaultTeamId },
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

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Create Rock")
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
					if (!this.dueDate) {
						new Notice("Ninety.io: select a due date.");
						return;
					}

					void runSubmit(btn, "Creating…", async () => {
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
							new Notice("Ninety.io: Rock created, but the response was empty — check Ninety.io to confirm.");
							this.close();
							return;
						}

						new Notice(`Ninety.io: Rock "${rock.title}" created.`);
						this.close();
					});
				});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
