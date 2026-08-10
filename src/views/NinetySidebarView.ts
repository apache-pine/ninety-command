import { type IconName, ItemView, type WorkspaceLeaf } from "obsidian";
import type { IssueResponseDTO } from "../api/resources/issues";
import type { RockResponseDTO } from "../api/resources/rocks";
import type { TodoResponseDTO } from "../api/resources/todos";
import type NinetyPlugin from "../main";
import { CreateIssueModal } from "../modals/CreateIssueModal";
import { CreateRockModal } from "../modals/CreateRockModal";
import { CreateTodoModal } from "../modals/CreateTodoModal";
import { getPrefillFromSelection } from "../utils/prefill";
import { NinetySection, type SectionFetchResult } from "./NinetySection";

export const NINETY_VIEW_TYPE = "ninety-io-panel";

const SECTION_DISPLAY_LIMIT = 10;

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
			fetchFn: () => this.fetchIssues(),
			renderItem: (issue, rowEl) => this.renderIssueRow(issue, rowEl),
			emptyText: "No open Issues.",
		});

		this.todosSection = new NinetySection<TodoResponseDTO>({
			containerEl: this.sectionsEl,
			title: "To-Dos",
			addButtonLabel: "Create To-Do",
			onAddClick: () => this.openCreateTodo(),
			fetchFn: () => this.fetchTodos(),
			renderItem: (todo, rowEl) => this.renderTodoRow(todo, rowEl),
			emptyText: "No open To-Dos.",
		});

		this.rocksSection = new NinetySection<RockResponseDTO>({
			containerEl: this.sectionsEl,
			title: "Rocks",
			addButtonLabel: "Create Rock",
			onAddClick: () => this.openCreateRock(),
			fetchFn: () => this.fetchRocks(),
			renderItem: (rock, rowEl) => this.renderRockRow(rock, rowEl),
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

	private async fetchIssues(): Promise<SectionFetchResult<IssueResponseDTO>> {
		const teamId = this.plugin.settings.defaultTeamId;
		if (!teamId) return { items: [], moreAvailable: false };

		const page = await this.plugin.apiClient.issues.query({
			teamId,
			sortField: "createdDate",
			sortDirection: "DESC",
			pageSize: 50,
		});

		// No server-side completed/archived filter on this endpoint — filter client-side.
		const open = page.items.filter((issue) => !issue.completed && !issue.archived);
		return {
			items: open.slice(0, SECTION_DISPLAY_LIMIT),
			// Heuristic, not exact: filtering happens after a single raw page, so a team
			// with many closed Issues could have open ones this page never surfaces.
			moreAvailable: open.length > SECTION_DISPLAY_LIMIT || page.totalCount > page.items.length,
		};
	}

	private async fetchTodos(): Promise<SectionFetchResult<TodoResponseDTO>> {
		const teamId = this.plugin.settings.defaultTeamId;
		if (!teamId) return { items: [], moreAvailable: false };

		const page = await this.plugin.apiClient.todos.queryPaged({
			teamId,
			completed: false,
			archived: false,
			sort: "dueDate",
			order: "asc",
			page: 1,
			pageSize: SECTION_DISPLAY_LIMIT,
		});

		return { items: page.items, moreAvailable: page.totalCount > page.items.length };
	}

	private async fetchRocks(): Promise<SectionFetchResult<RockResponseDTO>> {
		const teamId = this.plugin.settings.defaultTeamId;
		if (!teamId) return { items: [], moreAvailable: false };

		const page = await this.plugin.apiClient.rocks.queryPaged({
			teamId,
			archived: false,
			pageSize: 50,
			sortField: "dueDate",
			sortDirection: "ASC",
		});

		// No "not completed" filter on this endpoint — filter client-side by status.
		const active = page.items.filter((rock) => rock.statusCode !== "DONE" && rock.statusCode !== "CANCELED");
		return {
			items: active.slice(0, SECTION_DISPLAY_LIMIT),
			moreAvailable: active.length > SECTION_DISPLAY_LIMIT || page.totalCount > page.items.length,
		};
	}

	private renderIssueRow(issue: IssueResponseDTO, rowEl: HTMLElement): void {
		rowEl.createDiv({ text: issue.title, cls: "ninety-item-title" });
		const meta = rowEl.createDiv({ cls: "ninety-picker-sub" });
		meta.createSpan({ text: issue.intervalCode === "LONG_TERM" ? "Long-term" : "Short-term" });
		if (issue.priority && issue.priority > 0) {
			meta.createSpan({ text: ` · Priority ${issue.priority}` });
		}
	}

	private renderTodoRow(todo: TodoResponseDTO, rowEl: HTMLElement): void {
		rowEl.createDiv({ text: todo.title, cls: "ninety-item-title" });
		if (todo.dueDate) {
			rowEl.createDiv({
				text: `Due ${new Date(todo.dueDate).toLocaleDateString()}`,
				cls: "ninety-picker-sub",
			});
		}
	}

	private renderRockRow(rock: RockResponseDTO, rowEl: HTMLElement): void {
		rowEl.createDiv({ text: rock.title, cls: "ninety-item-title" });
		const meta = rowEl.createDiv({ cls: "ninety-picker-sub" });
		meta.createSpan({ text: rock.statusCode, cls: `ninety-badge ${rockStatusBadgeClass(rock.statusCode)}` });
		meta.createSpan({ text: ` · ${new Date(rock.dueDate).toLocaleDateString()} · ${rock.quarter}` });
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

function rockStatusBadgeClass(status: RockResponseDTO["statusCode"]): string {
	switch (status) {
		case "ON_TRACK":
		case "DONE":
			return "is-on-track";
		case "OFF_TRACK":
			return "is-off-track";
		default:
			return "is-draft";
	}
}
