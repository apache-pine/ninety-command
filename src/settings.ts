import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "./api/errors";
import { fetchAndCacheAll, fetchAndCacheTeams } from "./cache";
import type NinetyPlugin from "./main";

type ConnectionStatus =
	| { state: "idle" }
	| { state: "pending" }
	| { state: "success" }
	| { state: "error"; message: string };

export class NinetySettingTab extends PluginSettingTab {
	private plugin: NinetyPlugin;
	private connectionStatus: ConnectionStatus = { state: "idle" };
	private isRefreshingCache = false;

	constructor(app: App, plugin: NinetyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Ninety.io" });

		this.renderTokenSetting(containerEl);
		this.renderConnectionStatusEl(containerEl);
		this.renderTestConnectionSetting(containerEl);
		this.renderDefaultTeamSetting(containerEl);
		this.renderAutoRefreshSetting(containerEl);
		this.renderCacheSetting(containerEl);
	}

	private renderTokenSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("API token")
			.setDesc(
				"Personal Access Token, from app.ninety.io/settings/user/developer-settings. " +
					"Stored unencrypted in this plugin's data.json, inside your vault — don't sync or share that file if you'd rather keep it private.",
			)
			.addText((text) => {
				text.inputEl.type = "password";
				text.inputEl.style.width = "100%";
				text
					.setPlaceholder("Paste your token here")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value.trim();
						await this.plugin.saveSettings();
						// The old connection state (and any cached teams it unlocked) is no
						// longer trustworthy against a changed token.
						this.connectionStatus = { state: "idle" };
						this.display();
					});
			});
	}

	private renderConnectionStatusEl(containerEl: HTMLElement): void {
		const status = this.connectionStatus;
		if (status.state === "idle") {
			return;
		}

		const el = containerEl.createDiv({ cls: "ninety-connection-status" });
		if (status.state === "pending") {
			el.addClass("is-pending");
			el.setText("Testing connection…");
		} else if (status.state === "success") {
			el.addClass("is-success");
			el.setText("Connected.");
		} else {
			el.addClass("is-error");
			el.setText(status.message);
		}
	}

	private renderTestConnectionSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Test connection")
			.setDesc("Validates the token and loads the teams you can assign work to.")
			.addButton((btn) => {
				btn.setButtonText("Test Connection").onClick(async () => {
					if (!this.plugin.settings.apiToken) {
						new Notice("Ninety.io: enter an API token first.");
						return;
					}

					btn.setDisabled(true);
					this.connectionStatus = { state: "pending" };
					this.display();

					try {
						await this.plugin.apiClient.teams.list();
						await fetchAndCacheTeams(this.plugin);

						this.connectionStatus = { state: "success" };
						new Notice("Ninety.io: connection successful.");
					} catch (err) {
						const message =
							err instanceof NinetyApiError
								? describeApiError(err)
								: "Ninety.io: connection failed.";
						this.connectionStatus = { state: "error", message };
						new Notice(message);
					}

					this.display();
				});
			});
	}

	private renderDefaultTeamSetting(containerEl: HTMLElement): void {
		const teams = this.plugin.settings.teamsCache;
		const hasTeams = teams.length > 0;

		new Setting(containerEl)
			.setName("Default team")
			.setDesc(
				hasTeams
					? "Used to pre-fill the team when creating Issues, To-Dos, and Rocks."
					: "Test the connection above to load your teams.",
			)
			.addDropdown((dropdown) => {
				dropdown.setDisabled(!hasTeams);

				if (!hasTeams) {
					dropdown.addOption("", "No teams loaded");
					return;
				}

				dropdown.addOption("", "Select a team…");
				for (const team of teams) {
					const label = team.isMember ? team.name : `${team.name} (not a member)`;
					dropdown.addOption(team._id, label);
				}

				dropdown.setValue(this.plugin.settings.defaultTeamId ?? "");
				dropdown.onChange(async (value) => {
					const selected = teams.find((team) => team._id === value);
					this.plugin.settings.defaultTeamId = selected ? selected._id : null;
					this.plugin.settings.defaultTeamName = selected ? selected.name : null;
					await this.plugin.saveSettings();
				});
			});
	}

	private renderAutoRefreshSetting(containerEl: HTMLElement): void {
		const options: [string, string][] = [
			["0", "Off"],
			["5", "Every 5 minutes"],
			["15", "Every 15 minutes"],
			["30", "Every 30 minutes"],
			["60", "Every hour"],
		];

		new Setting(containerEl)
			.setName("Auto-refresh panel")
			.setDesc("Automatically refresh the Ninety.io sidebar panel while it's open.")
			.addDropdown((dropdown) => {
				for (const [value, label] of options) {
					dropdown.addOption(value, label);
				}
				dropdown.setValue(String(this.plugin.settings.autoRefreshMinutes));
				dropdown.onChange(async (value) => {
					this.plugin.settings.autoRefreshMinutes = Number(value);
					await this.plugin.saveSettings();
					this.plugin.restartAutoRefresh();
				});
			});
	}

	private renderCacheSetting(containerEl: HTMLElement): void {
		const lastUpdated = this.plugin.settings.cacheLastUpdated;

		new Setting(containerEl)
			.setName("Cached data")
			.setDesc(lastUpdated ? `Last refreshed: ${new Date(lastUpdated).toLocaleString()}` : "Never refreshed.")
			.addButton((btn) => {
				btn
					.setButtonText(this.isRefreshingCache ? "Refreshing…" : "Refresh now")
					.setDisabled(this.isRefreshingCache)
					.onClick(async () => {
						if (!this.plugin.settings.apiToken) {
							new Notice("Ninety.io: enter an API token first.");
							return;
						}

						this.isRefreshingCache = true;
						this.display();

						try {
							await Promise.all([this.plugin.apiClient.teams.list(), fetchAndCacheAll(this.plugin)]);

							new Notice("Ninety.io: cached data refreshed.");
						} catch (err) {
							const message =
								err instanceof NinetyApiError
									? describeApiError(err)
									: "Ninety.io: refresh failed.";
							new Notice(message);
						} finally {
							this.isRefreshingCache = false;
							this.display();
						}
					});
			});
	}
}
