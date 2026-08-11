import { Notice, Plugin } from "obsidian";
import { CommandApiClient } from "./api/client";
import { describeApiError, CommandApiError } from "./api/errors";
import { ensureTeamsCache } from "./cache";
import { registerIssuesCodeBlock } from "./codeBlocks/issuesBlock";
import { registerRocksCodeBlock } from "./codeBlocks/rocksBlock";
import { registerTodosCodeBlock } from "./codeBlocks/todosBlock";
import { CreateIssueModal } from "./modals/CreateIssueModal";
import { CreateMilestoneModal } from "./modals/CreateMilestoneModal";
import { CreateRockModal } from "./modals/CreateRockModal";
import { CreateTodoModal } from "./modals/CreateTodoModal";
import { RockPickerModal } from "./modals/RockPickerModal";
import { CommandSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type CommandSettings } from "./types/settings";
import { getPrefillFromSelection } from "./utils/prefill";
import { COMMAND_VIEW_TYPE, CommandSidebarView } from "./views/CommandSidebarView";

export default class CommandPlugin extends Plugin {
	settings!: CommandSettings;
	apiClient!: CommandApiClient;
	private autoRefreshIntervalId: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.apiClient = new CommandApiClient(() => this.settings.apiToken);

		this.addSettingTab(new CommandSettingTab(this.app, this));
		this.registerCommands();

		this.registerView(COMMAND_VIEW_TYPE, (leaf) => new CommandSidebarView(leaf, this));
		this.addRibbonIcon("layout-list", "Open Ninety Command panel", () => {
			void this.activateView();
		});
		this.addCommand({
			id: "open-ninety-command-panel",
			name: "Open Ninety Command panel",
			callback: () => {
				void this.activateView();
			},
		});

		registerIssuesCodeBlock(this);
		registerTodosCodeBlock(this);
		registerRocksCodeBlock(this);

		this.restartAutoRefresh();
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(COMMAND_VIEW_TYPE);
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
				new CreateIssueModal(this.app, this, { mode: "create", prefill: getPrefillFromSelection(this.app) }).open();
			},
		});

		this.addCommand({
			id: "create-todo",
			name: "Create To-Do",
			callback: () => {
				if (!this.requireToken()) return;
				new CreateTodoModal(this.app, this, { mode: "create", prefill: getPrefillFromSelection(this.app) }).open();
			},
		});

		this.addCommand({
			id: "create-rock",
			name: "Create Rock",
			callback: () => {
				if (!this.requireToken()) return;
				new CreateRockModal(this.app, this, { mode: "create", prefill: getPrefillFromSelection(this.app) }).open();
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

	/** Reuses an existing panel leaf if one's already open, rather than creating duplicates. */
	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(COMMAND_VIEW_TYPE);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			new Notice("Ninety Command: couldn't open the panel — no sidebar space available.");
			return;
		}

		await leaf.setViewState({ type: COMMAND_VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	/** Called on load and whenever the auto-refresh setting changes, so it takes effect immediately. */
	restartAutoRefresh(): void {
		if (this.autoRefreshIntervalId !== null) {
			window.clearInterval(this.autoRefreshIntervalId);
			this.autoRefreshIntervalId = null;
		}

		if (this.settings.autoRefreshMinutes <= 0) {
			return;
		}

		const intervalId = window.setInterval(
			() => this.refreshOpenPanels(),
			this.settings.autoRefreshMinutes * 60_000,
		);
		this.autoRefreshIntervalId = this.registerInterval(intervalId);
	}

	private refreshOpenPanels(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(COMMAND_VIEW_TYPE)) {
			if (leaf.view instanceof CommandSidebarView) {
				void leaf.view.refreshAll();
			}
		}
	}

	private requireToken(): boolean {
		if (!this.settings.apiToken) {
			new Notice("Ninety Command: enter an API token first, in Settings → Ninety Command.");
			return false;
		}
		return true;
	}

	/**
	 * FuzzySuggestModal's item list is synchronous, so Rocks (and teams, for
	 * labeling) must be fetched before RockPickerModal is constructed.
	 */
	private async openRockPickerForMilestone(): Promise<void> {
		const notice = new Notice("Ninety Command: loading Rocks…", 0);
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
				new Notice("Ninety Command: no Rocks found to add a Milestone to.");
				return;
			}

			const prefill = getPrefillFromSelection(this.app);
			new RockPickerModal(this.app, page.items, teams, (rock) => {
				new CreateMilestoneModal(this.app, this, rock, prefill).open();
			}).open();
		} catch (err) {
			notice.hide();
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load Rocks.";
			new Notice(message);
		}
	}
}
