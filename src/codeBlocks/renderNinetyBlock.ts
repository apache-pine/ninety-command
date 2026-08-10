import { MarkdownRenderChild } from "obsidian";
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
		ctx.addChild(new NinetyBlockRenderChild(el, plugin, config, source));
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
	) {
		super(containerEl);
	}

	onload(): void {
		const wrapper = this.containerEl.createDiv({ cls: "ninety-codeblock" });
		this.titleEl = wrapper.createDiv({ cls: "ninety-codeblock-title", text: this.config.resourceLabel });

		const toolbarEl = wrapper.createDiv({ cls: "ninety-panel-toolbar" });
		const refreshBtn = toolbarEl.createEl("button", { text: "Refresh" });
		refreshBtn.addEventListener("click", () => void this.render());

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
}
