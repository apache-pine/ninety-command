import {
	MarkdownRenderChild,
	MarkdownView,
	type MarkdownPostProcessorContext,
	setIcon,
	TFile,
} from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type CommandPlugin from "../main";
import type { QueryResult } from "../queries";
import { parseBlockParams, parseTriStateBool } from "../utils/blockParams";
import { BlockParamError } from "./blockErrors";

export interface BlockContext {
	/** Appended to the block's title after " — ". */
	label: string;
}

export interface CommandBlockConfig<T, TContext extends BlockContext = BlockContext> {
	language: string;
	resourceLabel: string;
	emptyText: string;
	renderRow: (item: T, rowEl: HTMLElement) => void;
	/** Resolves whatever this resource needs (team id(s), personal-mode, etc.) from params. Throws BlockParamError on failure. */
	resolveContext: (plugin: CommandPlugin, params: Record<string, string>) => Promise<TContext>;
	fetch: (plugin: CommandPlugin, context: TContext, limit: number, params: Record<string, string>) => Promise<QueryResult<T>>;
	/** Only called when the block sets `interactive: true` — adds complete/edit/delete buttons to each row. */
	renderActions?: (plugin: CommandPlugin, item: T, actionsEl: HTMLElement, onChanged: () => void) => void;
	/** aria-label/tooltip for the header add button, e.g. "Add Issue". Required for the add button to render at all. */
	addButtonLabel?: string;
	/**
	 * Opens this resource's "create" modal, mirroring the command-palette add command. Shown in the
	 * header when the block sets `addbutton: true`, or `interactive: true` with the
	 * "Show add button in interactive code blocks" setting on.
	 */
	onAddClick?: (plugin: CommandPlugin, onCreated: () => void) => void;
}

export function registerCommandCodeBlock<T, TContext extends BlockContext>(
	plugin: CommandPlugin,
	config: CommandBlockConfig<T, TContext>,
): void {
	plugin.registerMarkdownCodeBlockProcessor(config.language, (source, el, ctx) => {
		ctx.addChild(new CommandBlockRenderChild(el, plugin, config, source, ctx));
	});
}

function parseLimitParam(value: string | undefined, defaultValue: number): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

/** `maxheight: 400` or `maxheight: 400px` → `"400px"`. Anything else (unset, non-positive, non-numeric) means no cap. */
function parseMaxHeightParam(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const n = Number(value.trim().replace(/px$/i, ""));
	return Number.isFinite(n) && n > 0 ? `${n}px` : undefined;
}

class CommandBlockRenderChild<T, TContext extends BlockContext> extends MarkdownRenderChild {
	private titleEl!: HTMLElement;
	private countEl!: HTMLElement;
	private listEl!: HTMLElement;

	constructor(
		containerEl: HTMLElement,
		private plugin: CommandPlugin,
		private config: CommandBlockConfig<T, TContext>,
		private source: string,
		private ctx: MarkdownPostProcessorContext,
	) {
		super(containerEl);
	}

	onload(): void {
		const wrapper = this.containerEl.createDiv({ cls: "ninety-command-codeblock" });

		const headerEl = wrapper.createDiv({ cls: "ninety-command-codeblock-header" });
		const titleWrapEl = headerEl.createDiv({ cls: "ninety-command-codeblock-title-wrap" });
		this.titleEl = titleWrapEl.createSpan({ cls: "ninety-command-codeblock-title", text: this.config.resourceLabel });
		this.countEl = titleWrapEl.createSpan({ cls: "ninety-command-codeblock-count" });

		const actionsEl = headerEl.createDiv({ cls: "ninety-command-codeblock-actions" });

		if (this.showAddButton()) {
			const addBtn = actionsEl.createEl("button", {
				cls: "clickable-icon",
				attr: { "aria-label": this.config.addButtonLabel ?? "Add" },
			});
			setIcon(addBtn, "plus");
			addBtn.addEventListener("click", () => this.config.onAddClick?.(this.plugin, () => void this.render()));
		}

		const refreshBtn = actionsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh" } });
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => void this.render());

		const editBtn = actionsEl.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Edit this block" },
		});
		setIcon(editBtn, "code");
		editBtn.addEventListener("click", () => void this.openInEditor());

		this.listEl = wrapper.createDiv({ cls: "ninety-command-section-list" });

		void this.render();
	}

	/**
	 * Static for this block instance's lifetime — `interactive`/`addbutton`/the source
	 * text never change after the block is parsed, so this is safe to compute once in
	 * onload() rather than on every render().
	 */
	private showAddButton(): boolean {
		if (!this.config.onAddClick) return false;

		const params = parseBlockParams(this.source);
		if (parseTriStateBool(params.addbutton, false) === true) return true;

		const interactive = parseTriStateBool(params.interactive, false) === true;
		return interactive && this.plugin.settings.showAddButtonInInteractive;
	}

	private async render(): Promise<void> {
		this.listEl.empty();
		this.listEl.createEl("p", { text: "Loading…", cls: "ninety-command-modal-loading" });
		this.countEl.setText("");

		const params = parseBlockParams(this.source);

		const maxHeight = parseMaxHeightParam(params.maxheight);
		this.listEl.style.maxHeight = maxHeight ?? "";
		this.listEl.style.overflowY = maxHeight ? "auto" : "";

		try {
			const context = await this.config.resolveContext(this.plugin, params);
			if (!this.containerEl.isConnected) return;

			this.titleEl.setText(`${this.config.resourceLabel} — ${context.label}`);

			const limit = parseLimitParam(params.limit, this.plugin.settings.defaultItemLimit);
			const result = await this.config.fetch(this.plugin, context, limit, params);
			if (!this.containerEl.isConnected) return;

			if (this.plugin.settings.showCodeBlockCounts) {
				this.countEl.setText(result.moreAvailable ? `(${result.items.length}+)` : `(${result.items.length})`);
			}

			this.listEl.empty();

			if (result.items.length === 0) {
				this.listEl.createEl("p", { text: this.config.emptyText, cls: "ninety-command-panel-empty" });
				return;
			}

			const interactive = parseTriStateBool(params.interactive, false) === true;

			for (const item of result.items) {
				const rowEl = this.listEl.createDiv({ cls: "ninety-command-item" });
				this.config.renderRow(item, rowEl);
				if (interactive && this.config.renderActions) {
					const actionsEl = rowEl.createDiv({ cls: "ninety-command-item-actions" });
					this.config.renderActions(this.plugin, item, actionsEl, () => void this.render());
				}
			}

			if (result.moreAvailable) {
				this.listEl.createEl("p", { text: "…and more", cls: "ninety-command-section-more" });
			}
		} catch (err) {
			if (!this.containerEl.isConnected) return;
			const message =
				err instanceof CommandApiError
					? describeApiError(err)
					: err instanceof BlockParamError
						? err.message
						: "Ninety Command: failed to load.";
			this.renderMessage(message);
		}
	}

	private renderMessage(message: string): void {
		this.listEl.empty();
		this.listEl.createEl("p", { text: message, cls: "ninety-command-panel-empty" });
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
