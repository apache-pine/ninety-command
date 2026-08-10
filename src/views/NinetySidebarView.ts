import { type IconName, ItemView, type WorkspaceLeaf } from "obsidian";
import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO } from "../api/resources/rocks";
import type { TodoResponseDTO } from "../api/resources/todos";
import type NinetyPlugin from "../main";
import { CreateIssueModal } from "../modals/CreateIssueModal";
import { CreateRockModal } from "../modals/CreateRockModal";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { queryActiveRocks, queryOpenIssues, queryOpenTodos } from "../queries";
import { renderIssueRow, renderRockRow, renderTodoRow } from "../rendering";
import { getPrefillFromSelection } from "../utils/prefill";
import { NinetySection } from "./NinetySection";

export const NINETY_VIEW_TYPE = "ninety-io-panel";

export class NinetySidebarView extends ItemView {
	private gateEl!: HTMLElement;
	private sectionsEl!: HTMLElement;
	private issuesSection!: NinetySection<IssueResponseDTO>;
	private todosSection!: NinetySection<TodoResponseDTO>;
	private rocksSection!: NinetySection<RockResponseDTO>;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: NinetyPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return NINETY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Ninety.io";
	}

	getIcon(): IconName {
		return "layout-list";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ninety-sidebar-view");

		this.addAction("refresh-cw", "Refresh", () => void this.refreshAll());

		// Also a plain, always-visible button — the header action icon above can be
		// easy to miss (or get crowded out) depending on how the pane is docked.
		const toolbarEl = contentEl.createDiv({ cls: "ninety-panel-toolbar" });
		const refreshBtn = toolbarEl.createEl("button", { text: "Refresh" });
		refreshBtn.addEventListener("click", () => void this.refreshAll());

		this.gateEl = contentEl.createEl("p", { cls: "ninety-panel-empty" });
		this.sectionsEl = contentEl.createDiv();

		this.issuesSection = new NinetySection<IssueResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Issues",
			addButtonLabel: "Create Issue",
			onAddClick: () => this.openCreateIssue(),
			fetchFn: () => this.withDefaultTeam((teamId) => queryOpenIssues(this.plugin.apiClient, teamId)),
			renderItem: renderIssueRow,
			emptyText: "No open Issues.",
		});

		this.todosSection = new NinetySection<TodoResponseDTO>({
			containerEl: this.sectionsEl,
			title: "To-Dos",
			addButtonLabel: "Create To-Do",
			onAddClick: () => this.openCreateTodo(),
			fetchFn: () => this.withDefaultTeam((teamId) => queryOpenTodos(this.plugin.apiClient, teamId)),
			renderItem: renderTodoRow,
			emptyText: "No open To-Dos.",
		});

		this.rocksSection = new NinetySection<RockResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Rocks",
			addButtonLabel: "Create Rock",
			onAddClick: () => this.openCreateRock(),
			fetchFn: () => this.withDefaultTeam((teamId) => queryActiveRocks(this.plugin.apiClient, teamId)),
			renderItem: renderRockRow,
			emptyText: "No active Rocks.",
		});

		await this.refreshAll();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	/** Re-checks prerequisites fresh on every call, so changing settings while the panel is open just works. */
	async refreshAll(): Promise<void> {
		const { apiToken, defaultTeamId } = this.plugin.settings;

		if (!apiToken || !defaultTeamId) {
			this.sectionsEl.hide();
			this.gateEl.show();
			this.gateEl.setText(
				!apiToken
					? "Set an API token in Settings → Ninety.io."
					: "Set a default team in Settings → Ninety.io.",
			);
			return;
		}

		this.gateEl.hide();
		this.sectionsEl.show();

		await Promise.all([this.issuesSection.refresh(), this.todosSection.refresh(), this.rocksSection.refresh()]);
	}

	/** refreshAll() already gates on defaultTeamId before calling section.refresh(); this is defense-in-depth. */
	private withDefaultTeam<T>(
		fetch: (teamId: string) => Promise<{ items: T[]; moreAvailable: boolean }>,
	): Promise<{ items: T[]; moreAvailable: boolean }> {
		const teamId = this.plugin.settings.defaultTeamId;
		return teamId ? fetch(teamId) : Promise.resolve({ items: [], moreAvailable: false });
	}

	private openCreateIssue(): void {
		new CreateIssueModal(this.app, this.plugin, getPrefillFromSelection(this.app), () => {
			void this.issuesSection.refresh();
		}).open();
	}

	private openCreateTodo(): void {
		new CreateTodoModal(this.app, this.plugin, getPrefillFromSelection(this.app), () => {
			void this.todosSection.refresh();
		}).open();
	}

	private openCreateRock(): void {
		new CreateRockModal(this.app, this.plugin, getPrefillFromSelection(this.app), () => {
			void this.rocksSection.refresh();
		}).open();
	}
}
