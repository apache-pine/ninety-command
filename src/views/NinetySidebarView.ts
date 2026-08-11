import { type IconName, ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO } from "../api/resources/rocks";
import type { TodoResponseDTO } from "../api/resources/todos";
import type NinetyPlugin from "../main";
import { confirmDelete } from "../modals/ConfirmModal";
import { CreateIssueModal } from "../modals/CreateIssueModal";
import { CreateRockModal } from "../modals/CreateRockModal";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { EnterScoreModal } from "../modals/EnterScoreModal";
import { runRowAction } from "../modals/rowActions";
import { queryActiveRocks, queryOpenIssues, queryOpenTodos } from "../queries";
import { renderIssueRow, renderRockRow, renderTodoRow } from "../rendering";
import { getPrefillFromSelection } from "../utils/prefill";
import { NinetyScorecardSection } from "./NinetyScorecardSection";
import { NinetySection } from "./NinetySection";

export const NINETY_VIEW_TYPE = "ninety-io-panel";

function addRowActionButton(actionsEl: HTMLElement, icon: string, label: string): HTMLButtonElement {
	const btn = actionsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label, title: label } });
	setIcon(btn, icon);
	return btn;
}

export class NinetySidebarView extends ItemView {
	private gateEl!: HTMLElement;
	private sectionsEl!: HTMLElement;
	private issuesSection!: NinetySection<IssueResponseDTO>;
	private todosSection!: NinetySection<TodoResponseDTO>;
	private rocksSection!: NinetySection<RockResponseDTO>;
	private scorecardSection!: NinetyScorecardSection;

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

		this.gateEl = contentEl.createEl("p", { cls: "ninety-panel-empty" });
		this.sectionsEl = contentEl.createDiv();

		this.issuesSection = new NinetySection<IssueResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Issues",
			addButtonLabel: "Create Issue",
			onAddClick: () => this.openCreateIssue(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryOpenIssues(this.plugin.apiClient, teamId, this.plugin.settings.defaultItemLimit),
				),
			renderItem: renderIssueRow,
			renderActions: (issue, actionsEl) => this.renderIssueActions(issue, actionsEl),
			emptyText: "No open Issues.",
		});

		this.todosSection = new NinetySection<TodoResponseDTO>({
			containerEl: this.sectionsEl,
			title: "To-Dos",
			addButtonLabel: "Create To-Do",
			onAddClick: () => this.openCreateTodo(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryOpenTodos(this.plugin.apiClient, teamId, this.plugin.settings.defaultItemLimit),
				),
			renderItem: renderTodoRow,
			renderActions: (todo, actionsEl) => this.renderTodoActions(todo, actionsEl),
			emptyText: "No open To-Dos.",
		});

		this.rocksSection = new NinetySection<RockResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Rocks",
			addButtonLabel: "Create Rock",
			onAddClick: () => this.openCreateRock(),
			fetchFn: () =>
				this.withDefaultTeam((teamId) =>
					queryActiveRocks(this.plugin.apiClient, teamId, this.plugin.settings.defaultItemLimit),
				),
			renderItem: renderRockRow,
			renderActions: (rock, actionsEl) => this.renderRockActions(rock, actionsEl),
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

	/** refreshAll() already gates on defaultTeamId before calling section.refresh(); this is defense-in-depth. */
	private withDefaultTeam<T>(
		fetch: (teamId: string) => Promise<{ items: T[]; moreAvailable: boolean }>,
	): Promise<{ items: T[]; moreAvailable: boolean }> {
		const teamId = this.plugin.settings.defaultTeamId;
		return teamId ? fetch(teamId) : Promise.resolve({ items: [], moreAvailable: false });
	}

	// ---- Issues ----

	private renderIssueActions(issue: IssueResponseDTO, actionsEl: HTMLElement): void {
		const completeBtn = addRowActionButton(actionsEl, "check", "Mark complete");
		completeBtn.addEventListener("click", () => {
			void runRowAction(completeBtn, async () => {
				await this.plugin.apiClient.issues.update(issue.id, { completed: true });
				new Notice(`Ninety.io: Issue "${issue.title}" completed.`);
				await this.issuesSection.refresh();
			});
		});

		const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
		editBtn.addEventListener("click", () => this.openEditIssue(issue));

		const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
		deleteBtn.addEventListener("click", () => {
			void (async () => {
				const confirmed = await confirmDelete(this.app, `Delete Issue "${issue.title}"? This can't be undone.`);
				if (!confirmed) return;
				void runRowAction(deleteBtn, async () => {
					await this.plugin.apiClient.issues.delete(issue.id);
					new Notice(`Ninety.io: Issue "${issue.title}" deleted.`);
					await this.issuesSection.refresh();
				});
			})();
		});
	}

	private openCreateIssue(): void {
		new CreateIssueModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.issuesSection.refresh();
		}).open();
	}

	private openEditIssue(issue: IssueResponseDTO): void {
		new CreateIssueModal(this.app, this.plugin, { mode: "edit", issue }, () => {
			void this.issuesSection.refresh();
		}).open();
	}

	// ---- To-Dos ----

	private renderTodoActions(todo: TodoResponseDTO, actionsEl: HTMLElement): void {
		const completeBtn = addRowActionButton(actionsEl, "check", "Mark complete");
		completeBtn.addEventListener("click", () => {
			void runRowAction(completeBtn, async () => {
				await this.plugin.apiClient.todos.update(todo.id, { completed: true });
				new Notice(`Ninety.io: To-Do "${todo.title}" completed.`);
				await this.todosSection.refresh();
			});
		});

		const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
		editBtn.addEventListener("click", () => this.openEditTodo(todo));

		const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
		deleteBtn.addEventListener("click", () => {
			void (async () => {
				const confirmed = await confirmDelete(this.app, `Delete To-Do "${todo.title}"? This can't be undone.`);
				if (!confirmed) return;
				void runRowAction(deleteBtn, async () => {
					await this.plugin.apiClient.todos.delete(todo.id);
					new Notice(`Ninety.io: To-Do "${todo.title}" deleted.`);
					await this.todosSection.refresh();
				});
			})();
		});
	}

	private openCreateTodo(): void {
		new CreateTodoModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.todosSection.refresh();
		}).open();
	}

	private openEditTodo(todo: TodoResponseDTO): void {
		new CreateTodoModal(this.app, this.plugin, { mode: "edit", todo }, () => {
			void this.todosSection.refresh();
		}).open();
	}

	// ---- Rocks ----

	private renderRockActions(rock: RockResponseDTO, actionsEl: HTMLElement): void {
		const completeBtn = addRowActionButton(actionsEl, "check", "Mark done");
		completeBtn.addEventListener("click", () => {
			void runRowAction(completeBtn, async () => {
				await this.plugin.apiClient.rocks.update(rock._id, { statusCode: "DONE" });
				new Notice(`Ninety.io: Rock "${rock.title}" marked done.`);
				await this.rocksSection.refresh();
			});
		});

		const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
		editBtn.addEventListener("click", () => this.openEditRock(rock));

		const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
		deleteBtn.addEventListener("click", () => {
			void (async () => {
				const confirmed = await confirmDelete(this.app, `Delete Rock "${rock.title}"? This can't be undone.`);
				if (!confirmed) return;
				void runRowAction(deleteBtn, async () => {
					await this.plugin.apiClient.rocks.delete(rock._id);
					new Notice(`Ninety.io: Rock "${rock.title}" deleted.`);
					await this.rocksSection.refresh();
				});
			})();
		});
	}

	private openCreateRock(): void {
		new CreateRockModal(this.app, this.plugin, { mode: "create", prefill: getPrefillFromSelection(this.app) }, () => {
			void this.rocksSection.refresh();
		}).open();
	}

	private openEditRock(rock: RockResponseDTO): void {
		new CreateRockModal(this.app, this.plugin, { mode: "edit", rock }, () => {
			void this.rocksSection.refresh();
		}).open();
	}
}
