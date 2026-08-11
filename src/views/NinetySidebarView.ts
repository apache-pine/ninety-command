import { DropdownComponent, type IconName, ItemView, type WorkspaceLeaf } from "obsidian";
import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO } from "../api/resources/rocks";
import type { TodoResponseDTO } from "../api/resources/todos";
import { ensureUsersCache } from "../cache";
import type NinetyPlugin from "../main";
import { CreateIssueModal } from "../modals/CreateIssueModal";
import { CreateRockModal } from "../modals/CreateRockModal";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { EnterScoreModal } from "../modals/EnterScoreModal";
import { queryActiveRocks, queryOpenIssues, queryOpenTodos } from "../queries";
import { renderIssueRow, renderRockRow, renderTodoRow } from "../rendering";
import { renderIssueRowActions, renderRockRowActions, renderTodoRowActions } from "../rowActionRenderers";
import { getPrefillFromSelection } from "../utils/prefill";
import { NinetyScorecardSection } from "./NinetyScorecardSection";
import { NinetySection } from "./NinetySection";

export const NINETY_VIEW_TYPE = "ninety-io-panel";

export class NinetySidebarView extends ItemView {
	private gateEl!: HTMLElement;
	private sectionsEl!: HTMLElement;
	private issuesSection!: NinetySection<IssueResponseDTO>;
	private todosSection!: NinetySection<TodoResponseDTO>;
	private rocksSection!: NinetySection<RockResponseDTO>;
	private scorecardSection!: NinetyScorecardSection;
	/** Live, session-only override of the default assignee filter — resets to the persisted default on next open. */
	private currentAssigneeFilter: string | null = null;

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
		const refreshBtn = toolbarEl.createEl("button", { text: "Refresh", cls: "ninety-button" });
		refreshBtn.addEventListener("click", () => void this.refreshAll());

		this.currentAssigneeFilter = this.plugin.settings.defaultAssigneeUserId;

		const filterEl = contentEl.createDiv({ cls: "ninety-panel-filter" });
		filterEl.createSpan({ text: "Assignee: ", cls: "ninety-picker-sub" });
		const assigneeDropdown = new DropdownComponent(filterEl);
		assigneeDropdown.addOption("", "Everyone");
		if (this.plugin.settings.defaultAssigneeUserId) {
			// Seed the persisted default's label immediately, so the dropdown doesn't
			// flash "Everyone" while the full user list loads in the background.
			assigneeDropdown.addOption(
				this.plugin.settings.defaultAssigneeUserId,
				this.plugin.settings.defaultAssigneeUserName ?? this.plugin.settings.defaultAssigneeUserId,
			);
		}
		assigneeDropdown.setValue(this.currentAssigneeFilter ?? "");
		assigneeDropdown.onChange((value) => {
			this.currentAssigneeFilter = value || null;
			void this.refreshAll();
		});
		void this.populateAssigneeDropdown(assigneeDropdown);

		this.gateEl = contentEl.createEl("p", { cls: "ninety-panel-empty" });
		this.sectionsEl = contentEl.createDiv();

		this.issuesSection = new NinetySection<IssueResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Issues",
			addButtonLabel: "Create Issue",
			onAddClick: () => this.openCreateIssue(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryOpenIssues(
						this.plugin.apiClient,
						teamId,
						this.plugin.settings.defaultItemLimit,
						undefined,
						this.currentAssigneeFilter ?? undefined,
					),
				),
			renderItem: renderIssueRow,
			renderActions: (issue, actionsEl) =>
				renderIssueRowActions(this.plugin, issue, actionsEl, () => void this.issuesSection.refresh()),
			emptyText: "No open Issues.",
		});

		this.todosSection = new NinetySection<TodoResponseDTO>({
			containerEl: this.sectionsEl,
			title: "To-Dos",
			addButtonLabel: "Create To-Do",
			onAddClick: () => this.openCreateTodo(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryOpenTodos(
						this.plugin.apiClient,
						teamId,
						this.plugin.settings.defaultItemLimit,
						this.currentAssigneeFilter ?? undefined,
					),
				),
			renderItem: renderTodoRow,
			renderActions: (todo, actionsEl) =>
				renderTodoRowActions(this.plugin, todo, actionsEl, () => void this.todosSection.refresh()),
			emptyText: "No open To-Dos.",
		});

		this.rocksSection = new NinetySection<RockResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Rocks",
			addButtonLabel: "Create Rock",
			onAddClick: () => this.openCreateRock(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryActiveRocks(
						this.plugin.apiClient,
						teamId,
						this.plugin.settings.defaultItemLimit,
						this.currentAssigneeFilter ?? undefined,
					),
				),
			renderItem: renderRockRow,
			renderActions: (rock, actionsEl) =>
				renderRockRowActions(this.plugin, rock, actionsEl, () => void this.rocksSection.refresh()),
			emptyText: "No active Rocks.",
		});

		this.scorecardSection = new NinetyScorecardSection({
			containerEl: this.sectionsEl,
			title: "Scorecard",
			fetchFn: () => this.plugin.apiClient.scorecard.getTeamScorecard({ teamId: this.plugin.settings.defaultTeamId! }),
			onScoreEdit: (kpi, period) => {
				new EnterScoreModal(this.app, this.plugin, kpi, period, () => {
					void this.scorecardSection.refresh();
				}).open();
			},
			emptyText: "No Measurables configured for this team.",
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

		await Promise.all([
			this.issuesSection.refresh(),
			this.todosSection.refresh(),
			this.rocksSection.refresh(),
			this.scorecardSection.refresh(),
		]);
	}

	private async populateAssigneeDropdown(dropdown: DropdownComponent): Promise<void> {
		try {
			const users = await ensureUsersCache(this.plugin);
			const currentValue = dropdown.getValue();

			dropdown.selectEl.empty();
			dropdown.addOption("", "Everyone");
			for (const user of users) {
				const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
				dropdown.addOption(user.id, name || user.primaryEmail || user.id);
			}
			dropdown.setValue(currentValue);
		} catch {
			// Best-effort — leave whatever options were already there (Everyone, and
			// maybe the persisted default's seeded label) if the cache fetch fails.
		}
	}

	/** refreshAll() already gates on defaultTeamId before calling section.refresh(); this is defense-in-depth. */
	private withDefaultTeam<T>(
		fetch: (teamId: string) => Promise<{ items: T[]; moreAvailable: boolean }>,
	): Promise<{ items: T[]; moreAvailable: boolean }> {
		const teamId = this.plugin.settings.defaultTeamId;
		return teamId ? fetch(teamId) : Promise.resolve({ items: [], moreAvailable: false });
	}

	private openCreateIssue(): void {
		new CreateIssueModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.issuesSection.refresh();
		}).open();
	}

	private openCreateTodo(): void {
		new CreateTodoModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.todosSection.refresh();
		}).open();
	}

	private openCreateRock(): void {
		new CreateRockModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.rocksSection.refresh();
		}).open();
	}
}
