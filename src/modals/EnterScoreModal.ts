import { type App, Modal, Notice, Setting } from "obsidian";
import type { ScorecardKpiDTO, ScorecardPeriodDTO } from "../api/resources/scorecard";
import type NinetyPlugin from "../main";
import { formatKpiValue } from "../utils/kpiFormat";
import { runSubmit } from "./formHelpers";

export class EnterScoreModal extends Modal {
	private value: string;

	constructor(
		app: App,
		private plugin: NinetyPlugin,
		private kpi: ScorecardKpiDTO,
		private period: ScorecardPeriodDTO,
		private onSaved?: () => void,
	) {
		super(app);
		const current = kpi.scores[kpi.scores.length - 1];
		this.value = current?.value != null ? String(current.value) : "";
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: `Enter score — ${this.kpi.title}` });
		contentEl.createEl("p", { text: `Period: ${this.period.label}`, cls: "ninety-picker-sub" });
		if (this.kpi.defaultGoal != null) {
			contentEl.createEl("p", {
				text: `Goal: ${formatKpiValue(this.kpi.defaultGoal, this.kpi.unit, this.kpi.currency)}`,
				cls: "ninety-picker-sub",
			});
		}
		if (this.kpi.unit === "yesno") {
			contentEl.createEl("p", { text: "Enter 1 for Yes, 0 for No.", cls: "ninety-picker-sub" });
		}

		new Setting(contentEl).setName("Score").addText((text) => {
			text.inputEl.type = "number";
			text.inputEl.step = "any";
			text.setValue(this.value).onChange((v) => {
				this.value = v;
			});
		});

		new Setting(contentEl).addButton((btn) => {
			btn
				.setButtonText("Save score")
				.setCta()
				.onClick(() => {
					const parsed = Number(this.value);
					if (this.value.trim() === "" || Number.isNaN(parsed)) {
						new Notice("Ninety.io: enter a numeric score.");
						return;
					}

					void runSubmit(btn, "Saving…", async () => {
						await this.plugin.apiClient.scorecard.putScore(this.kpi.id, {
							value: parsed,
							periodStartDate: this.period.periodStartDate,
						});
						new Notice(`Ninety.io: score saved for "${this.kpi.title}".`);
						this.onSaved?.();
						this.close();
					});
				});
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
