import {
	MarkdownRenderChild,
	MarkdownView,
	type MarkdownPostProcessorContext,
	setIcon,
	TFile,
} from "obsidian";
import type { NinetyApiClient } from "../api/client";
import { describeApiError, NinetyApiError } from "../api/errors";
import type NinetyPlugin from "../main";
import { type QueryResult, SECTION_DISPLAY_LIMIT } from "../queries";
import { resolveTeamParam } from "../teamResolution";
import { parseBlockParams } from "../utils/blockParams";

export interface NinetyBlockConfig<T> {
	language: string;
	resourceLabel: string;
	emptyText: string;
	renderRow: (item: T, rowEl: HTMLElement) => void;
	fetch: (
		apiClient: NinetyApiClient,
		teamId: string,
		limit: number,
		params: Record<string, string>,
	) => Promise<QueryResult<T>>;
}

export function registerNinetyCodeBlock<T>(plugin: NinetyPlugin, config: NinetyBlockConfig<T>): void {
	plugin.registerMarkdownCodeBlockProcessor(config.language, (source, el, ctx) => {
		ctx.addChild(new NinetyBlockRenderChild(el, plugin, config, source, ctx));
	});
}

function parseLimitParam(value: string | undefined): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : SECTION_DISPLAY_LIMIT;
}

class NinetyBlockRenderChild<T> extends MarkdownRenderChild {
	private titleEl!: HTMLElement;
	private listEl!: HTMLElement;

	constructor(
		containerEl: HTMLElement,
		private plugin: NinetyPlugin,
		private config: NinetyBlockConfig<T>,
		private source: string,
		private ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	onload(): void {
		const wrapper = this.containerEl.createDiv({ cls: "ninety-codeblock" });

		const headerEl = wrapper.createDiv({ cls: "ninety-codeblock-header" });
		this.titleEl = headerEl.createSpan({ cls: "ninety-codeblock-title", text: this.config.resourceLabel });

		const actionsEl = headerEl.createDiv({ cls: "ninety-codeblock-actions" });

		const refreshBtn = actionsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh" } });
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => void this.render());

		const editBtn = actionsEl.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Edit this block" },
		});
		setIcon(editBtn, "code");
		editBtn.addEventListener("click", () => void this.openInEditor());

		this.listEl = wrapper.createDiv({ cls: "ninety-section-list" });

		void this.render();
	}

	private async render(): Promise<void> {
		this.listEl.empty();
		this.listEl.createEl("p", { text: "Loading…", cls: "ninety-modal-loading" });

		const params = parseBlockParams(this.source);

		try {
			const resolved = await resolveTeamParam(this.plugin, params.team);
			if (!this.containerEl.isConnected) return;

			if (!resolved) {
				const message = params.team
					? `Ninety.io: team "${params.team}" not found.`
					: "Ninety.io: no team specified and no default team set in Settings → Ninety.io.";
				this.renderMessage(message);
				return;
			}

			this.titleEl.setText(`${this.config.resourceLabel} — ${resolved.teamName}`);

			const limit = parseLimitParam(params.limit);
			const result = await this.config.fetch(this.plugin.apiClient, resolved.teamId, limit, params);
			if (!this.containerEl.isConnected) return;

			this.listEl.empty();

			if (result.items.length === 0) {
				this.listEl.createEl("p", { text: this.config.emptyText, cls: "ninety-panel-empty" });
				return;
			}

			for (const item of result.items) {
				const rowEl = this.listEl.createDiv({ cls: "ninety-item" });
				this.config.renderRow(item, rowEl);
			}

			if (result.moreAvailable) {
				this.listEl.createEl("p", { text: "…and more", cls: "ninety-section-more" });
			}
		} catch (err) {
			if (!this.containerEl.isConnected) return;
			const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: failed to load.";
			this.renderMessage(message);
		}
	}

	private renderMessage(message: string): void {
		this.listEl.empty();
		this.listEl.createEl("p", { text: message, cls: "ninety-panel-empty" });
	}

	/**
	 * Jumps to (and switches into editable source mode at) this block's location in
	 * its note. Uses the conventional-but-undocumented `eState: { line }` navigation
	 * shape, so every step here is best-effort: any failure is swallowed rather than
	 * surfaced, since worst case is just "the click did nothing."
	 */
	private async openInEditor(): Promise<void> {
		try {
			const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
			if (!(file instanceof TFile)) return;

			const sectionInfo = this.ctx.getSectionInfo(this.containerEl);

			const existingLeaf = this.plugin.app.workspace
				.getLeavesOfType("markdown")
				.find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path);
			const leaf = existingLeaf ?? this.plugin.app.workspace.getLeaf(false);

			await leaf.openFile(file, sectionInfo ? { eState: { line: sectionInfo.lineStart } } : undefined);
			this.plugin.app.workspace.setActiveLeaf(leaf, { focus: true });

			if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "preview") {
				const state = leaf.getViewState();
				await leaf.setViewState({ ...state, state: { ...state.state, mode: "source" } });
			}
		} catch {
			// Best-effort navigation — silently give up rather than surface an error
			// for what's ultimately a convenience shortcut (Ctrl+E still works).
		}
	}
}
