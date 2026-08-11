import { setIcon } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";
import type { ScorecardKpiDTO, ScorecardPeriodDTO, TeamScorecardResponseDTO } from "../api/resources/scorecard";
import { formatKpiValue } from "../utils/kpiFormat";

export interface CommandScorecardSectionOptions {
	containerEl: HTMLElement;
	title: string;
	fetchFn: () => Promise<TeamScorecardResponseDTO>;
	onScoreEdit: (kpi: ScorecardKpiDTO, currentPeriod: ScorecardPeriodDTO) => void;
	emptyText: string;
}

/**
 * Parallel to CommandSection, but purpose-built for the Scorecard's nested
 * group/KPI shape (which CommandSection's flat-list model doesn't fit) and
 * the fact that Measurables can't be created via this API (no "+" button).
 */
export class CommandScorecardSection {
	private listEl: HTMLElement;

	constructor(private opts: CommandScorecardSectionOptions) {
		const sectionEl = opts.containerEl.createDiv({ cls: "ninety-command-section" });
		sectionEl.createDiv({ cls: "ninety-command-section-header" }).createSpan({ text: opts.title });
		this.listEl = sectionEl.createDiv({ cls: "ninety-command-section-list" });
	}

	async refresh(): Promise<void> {
		this.listEl.empty();
		this.listEl.createEl("p", { text: "Loading…", cls: "ninety-command-modal-loading" });

		try {
			const scorecard = await this.opts.fetchFn();
			this.listEl.empty();

			const currentPeriod = scorecard.periods[scorecard.periods.length - 1];
			const hasKpis = scorecard.groups.some((g) => g.kpis.length > 0);

			if (!currentPeriod || !hasKpis) {
				this.listEl.createEl("p", { text: this.opts.emptyText, cls: "ninety-command-panel-empty" });
				return;
			}

			for (const group of scorecard.groups) {
				if (group.kpis.length === 0) continue;
				this.listEl.createEl("p", { text: group.name, cls: "ninety-command-scorecard-group-header" });
				for (const kpi of group.kpis) {
					const rowEl = this.listEl.createDiv({ cls: "ninety-command-item" });
					this.renderKpiRow(kpi, currentPeriod, rowEl);
				}
			}
		} catch (err) {
			this.listEl.empty();
			const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: failed to load Scorecard.";
			this.listEl.createEl("p", { text: message, cls: "ninety-command-panel-empty" });
		}
	}

	private renderKpiRow(kpi: ScorecardKpiDTO, currentPeriod: ScorecardPeriodDTO, rowEl: HTMLElement): void {
		// Scores is a parallel array to the top-level periods, same index.
		const currentScore = kpi.scores[kpi.scores.length - 1];

		rowEl.createDiv({ text: kpi.title, cls: "ninety-command-item-title" });
		rowEl.createDiv({ cls: "ninety-command-picker-sub" }).createSpan({
			text: `${formatKpiValue(currentScore?.value ?? null, kpi.unit, kpi.currency)} · ${currentPeriod.label} · ${kpi.ownerName}`,
		});

		const actionsEl = rowEl.createDiv({ cls: "ninety-command-item-actions" });
		const editBtn = actionsEl.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Enter score", title: "Enter score" },
		});
		setIcon(editBtn, "pencil");
		editBtn.addEventListener("click", () => this.opts.onScoreEdit(kpi, currentPeriod));
	}
}
