import { Plugin } from "obsidian";
import { NinetyApiClient } from "./api/client";
import { NinetySettingTab } from "./settings";
import { DEFAULT_SETTINGS, type NinetySettings } from "./types/settings";

export default class NinetyPlugin extends Plugin {
	settings!: NinetySettings;
	apiClient!: NinetyApiClient;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.apiClient = new NinetyApiClient(() => this.settings.apiToken);

		this.addSettingTab(new NinetySettingTab(this.app, this));
	}

	onunload(): void {
		// Nothing to clean up yet — no intervals, views, or listeners registered this phase.
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
