import { Notice, Plugin } from "obsidian";
import { NinetyApiClient } from "./api/client";
import { describeApiError, NinetyApiError } from "./api/errors";
import { ensureTeamsCache } from "./cache";
import { CreateIssueModal } from "./modals/CreateIssueModal";
import { CreateMilestoneModal } from "./modals/CreateMilestoneModal";
import { CreateRockModal } from "./modals/CreateRockModal";
import { CreateTodoModal } from "./modals/CreateTodoModal";
import { RockPickerModal } from "./modals/RockPickerModal";
import { NinetySettingTab } from "./settings";
import { DEFAULT_SETTINGS, type NinetySettings } from "./types/settings";
import { getPrefillFromSelection } from "./utils/prefill";

export default class NinetyPlugin extends Plugin {
	settings!: NinetySettings;
	apiClient!: NinetyApiClient;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.apiClient = new NinetyApiClient(() => this.settings.apiToken);

		this.addSettingTab(new NinetySettingTab(this.app, this));
		this.registerCommands();
	}

	onunload(): void {
		// Nothing to clean up yet — no intervals, views, or listeners registered this phase.
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private registerCommands(): void {
		this.addCommand({
			id: "create-issue",
			name: "Create Issue",
			callback: () => {
				if (!this.requireToken()) return;
				new CreateIssueModal(this.app, this, getPrefillFromSelection(this.app)).open();
			},
		});

		this.addCommand({
			id: "create-todo",
			name: "Create To-Do",
			callback: () => {
				if (!this.requireToken()) return;
				new CreateTodoModal(this.app, this, getPrefillFromSelection(this.app)).open();
			},
		});

		this.addCommand({
			id: "create-rock",
			name: "Create Rock",
			callback: () => {
				if (!this.requireToken()) return;
				new CreateRockModal(this.app, this, getPrefillFromSelection(this.app)).open();
			},
		});

		this.addCommand({
			id: "add-milestone-to-rock",
			name: "Add Milestone to Rock",
			callback: () => {
				if (!this.requireToken()) return;
				void this.openRockPickerForMilestone();
			},
		});
	}

	private requireToken(): boolean {
		if (!this.settings.apiToken) {
			new Notice("Ninety.io: enter an API token first, in Settings → Ninety.io.");
			return false;
		}
		return true;
	}

	/**
	 * FuzzySuggestModal's item list is synchronous, so Rocks (and teams, for
	 * labeling) must be fetched before RockPickerModal is constructed.
	 */
	private async openRockPickerForMilestone(): Promise<void> {
		const notice = new Notice("Ninety.io: loading Rocks…", 0);
		try {
			const teamId = this.settings.defaultTeamId ?? undefined;
			const [teams, page] = await Promise.all([
				ensureTeamsCache(this),
				this.apiClient.rocks.queryPaged({
					teamId,
					archived: false,
					pageSize: 200,
					sortField: "title",
					sortDirection: "ASC",
				}),
			]);

			notice.hide();

			if (page.items.length === 0) {
				new Notice("Ninety.io: no Rocks found to add a Milestone to.");
				return;
			}

			const prefill = getPrefillFromSelection(this.app);
			new RockPickerModal(this.app, page.items, teams, (rock) => {
				new CreateMilestoneModal(this.app, this, rock, prefill).open();
			}).open();
		} catch (err) {
			notice.hide();
			const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: failed to load Rocks.";
			new Notice(message);
		}
	}
}
