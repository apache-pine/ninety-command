import { type App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
	private resolve!: (value: boolean) => void;
	private resolved = false;

	constructor(
		app: App,
		private message: string,
		private confirmLabel = "Delete",
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("p", { text: this.message });

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.settle(false);
					this.close();
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText(this.confirmLabel)
					.setWarning()
					.onClick(() => {
						this.settle(true);
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		// Esc / click-outside dismissal without a button click still counts as cancel.
		this.settle(false);
	}

	private settle(value: boolean): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(value);
	}

	waitForClose(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolve = resolve;
		});
	}
}

export function confirmAction(app: App, message: string, confirmLabel: string): Promise<boolean> {
	const modal = new ConfirmModal(app, message, confirmLabel);
	const promise = modal.waitForClose();
	modal.open();
	return promise;
}
