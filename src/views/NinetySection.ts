import { describeApiError, NinetyApiError } from "../api/errors";

export interface SectionFetchResult<T> {
	items: T[];
	/** True when the server has more matching items than were fetched/shown. */
	moreAvailable: boolean;
}

export interface NinetySectionOptions<T> {
	containerEl: HTMLElement;
	title: string;
	addButtonLabel: string;
	onAddClick: () => void;
	fetchFn: () => Promise<SectionFetchResult<T>>;
	renderItem: (item: T, rowEl: HTMLElement) => void;
	/** Appended after renderItem into a dedicated actions row. Omitted → no buttons rendered. */
	renderActions?: (item: T, actionsEl: HTMLElement) => void;
	emptyText: string;
}

/**
 * Shared "header + fetch + list + empty/error state" controller reused by the
 * Issues/To-Dos/Rocks sections of the sidebar panel. Renders when told to via
 * refresh() — no internal caching or auto-refresh.
 */
export class NinetySection<T> {
	private listEl: HTMLElement;

	constructor(private opts: NinetySectionOptions<T>) {
		const sectionEl = opts.containerEl.createDiv({ cls: "ninety-section" });

		const headerEl = sectionEl.createDiv({ cls: "ninety-section-header" });
		headerEl.createSpan({ text: opts.title });
		const addBtn = headerEl.createEl("button", {
			text: "+",
			cls: "clickable-icon",
			attr: { "aria-label": opts.addButtonLabel, title: opts.addButtonLabel },
		});
		addBtn.addEventListener("click", () => opts.onAddClick());

		this.listEl = sectionEl.createDiv({ cls: "ninety-section-list" });
	}

	async refresh(): Promise<void> {
		this.listEl.empty();
		this.listEl.createEl("p", { text: "Loading…", cls: "ninety-modal-loading" });

		try {
			const result = await this.opts.fetchFn();
			this.listEl.empty();

			if (result.items.length === 0) {
				this.listEl.createEl("p", { text: this.opts.emptyText, cls: "ninety-panel-empty" });
				return;
			}

			for (const item of result.items) {
				const rowEl = this.listEl.createDiv({ cls: "ninety-item" });
				this.opts.renderItem(item, rowEl);
				if (this.opts.renderActions) {
					const actionsEl = rowEl.createDiv({ cls: "ninety-item-actions" });
					this.opts.renderActions(item, actionsEl);
				}
			}

			if (result.moreAvailable) {
				this.listEl.createEl("p", { text: "…and more", cls: "ninety-section-more" });
			}
		} catch (err) {
			this.listEl.empty();
			const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: failed to load.";
			this.listEl.createEl("p", { text: message, cls: "ninety-panel-empty" });
		}
	}
}
