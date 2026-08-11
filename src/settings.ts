import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import { describeApiError, CommandApiError } from "./api/errors";
import { fetchAndCacheAll, fetchAndCacheTeams } from "./cache";
import {
	ISSUES_PARAM_REFERENCE,
	type ParamReferenceRow,
	ROCKS_PARAM_REFERENCE,
	TODOS_PARAM_REFERENCE,
} from "./codeBlocks/paramReference";
import type CommandPlugin from "./main";

type ConnectionStatus =
	| { state: "idle" }
	| { state: "pending" }
	| { state: "success" }
	| { state: "error"; message: string };

export class CommandSettingTab extends PluginSettingTab {
	private plugin: CommandPlugin;
	private connectionStatus: ConnectionStatus = { state: "idle" };
	private isRefreshingCache = false;

	constructor(app: App, plugin: CommandPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Ninety Command" });

		this.renderTokenSetting(containerEl);
		this.renderConnectionStatusEl(containerEl);
		this.renderTestConnectionSetting(containerEl);
		this.renderDefaultTeamSetting(containerEl);
		this.renderDefaultAssigneeSetting(containerEl);
		this.renderAutoRefreshSetting(containerEl);
		this.renderDefaultLimitSetting(containerEl);
		this.renderCacheSetting(containerEl);
		this.renderNinetyLink(containerEl);
		this.renderParamReferenceSetting(containerEl);
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

		const el = containerEl.createDiv({ cls: "ninety-command-connection-status" });
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
						new Notice("Ninety Command: enter an API token first.");
						return;
					}

					btn.setDisabled(true);
					this.connectionStatus = { state: "pending" };
					this.display();

					try {
						await this.plugin.apiClient.teams.list();
						await fetchAndCacheTeams(this.plugin);

						this.connectionStatus = { state: "success" };
						new Notice("Ninety Command: connection successful.");
					} catch (err) {
						const message =
							err instanceof CommandApiError
								? describeApiError(err)
								: "Ninety Command: connection failed.";
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

	private renderDefaultAssigneeSetting(containerEl: HTMLElement): void {
		const users = this.plugin.settings.usersCache;
		const hasUsers = users.length > 0;

		new Setting(containerEl)
			.setName("Default assignee")
			.setDesc(
				hasUsers
					? "Pre-selects the sidebar panel's assignee filter when it opens. Change it live in the panel any time."
					: "Click \"Refresh now\" below to load your company's users.",
			)
			.addDropdown((dropdown) => {
				dropdown.setDisabled(!hasUsers);

				if (!hasUsers) {
					dropdown.addOption("", "No users loaded");
					return;
				}

				dropdown.addOption("", "Everyone");
				for (const user of users) {
					const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
					dropdown.addOption(user.id, name || user.primaryEmail || user.id);
				}

				dropdown.setValue(this.plugin.settings.defaultAssigneeUserId ?? "");
				dropdown.onChange(async (value) => {
					const selected = users.find((user) => user.id === value);
					this.plugin.settings.defaultAssigneeUserId = selected ? selected.id : null;
					this.plugin.settings.defaultAssigneeUserName = selected
						? [selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.primaryEmail || selected.id
						: null;
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
			.setDesc("Automatically refresh the Ninety Command sidebar panel while it's open.")
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
							new Notice("Ninety Command: enter an API token first.");
							return;
						}

						this.isRefreshingCache = true;
						this.display();

						try {
							await Promise.all([this.plugin.apiClient.teams.list(), fetchAndCacheAll(this.plugin)]);

							new Notice("Ninety Command: cached data refreshed.");
						} catch (err) {
							const message =
								err instanceof CommandApiError
									? describeApiError(err)
									: "Ninety Command: refresh failed.";
							new Notice(message);
						} finally {
							this.isRefreshingCache = false;
							this.display();
						}
					});
			});
	}

	private renderDefaultLimitSetting(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Default item limit")
			.setDesc(
				"Default number of rows shown per sidebar section, and in any code block that doesn't set its own limit:.",
			)
			.addText((text) => {
				text.inputEl.type = "number";
				text.inputEl.min = "1";
				text.setValue(String(this.plugin.settings.defaultItemLimit)).onChange(async (value) => {
					const n = Number(value);
					if (Number.isFinite(n) && n > 0) {
						this.plugin.settings.defaultItemLimit = Math.floor(n);
						await this.plugin.saveSettings();
					}
				});
			});
	}

	private renderNinetyLink(containerEl: HTMLElement): void {
		const p = containerEl.createEl("p", { cls: "ninety-command-picker-sub" });
		p.createEl("a", {
			text: "Open app.ninety.io ↗",
			href: "https://app.ninety.io",
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	private renderParamReferenceSetting(containerEl: HTMLElement): void {
		const details = containerEl.createEl("details", { cls: "ninety-command-param-reference" });
		details.createEl("summary", { text: "Code block parameter reference" });

		details.createEl("p", {
			cls: "ninety-command-picker-sub",
			text: "Each line inside a code block is a key: value pair. Unrecognized keys are ignored.",
		});

		this.renderParamSection(details, "ninety-issues", ISSUES_PARAM_REFERENCE);
		this.renderParamSection(details, "ninety-todos", TODOS_PARAM_REFERENCE);
		this.renderParamSection(details, "ninety-rocks", ROCKS_PARAM_REFERENCE);
	}

	private renderParamSection(container: HTMLElement, language: string, rows: ParamReferenceRow[]): void {
		container.createEl("h4").createEl("code", { text: language });

		const table = container.createEl("table", { cls: "ninety-command-param-table" });
		const headerRow = table.createEl("thead").createEl("tr");
		for (const heading of ["Parameter", "Accepts", "Default", "Notes"]) {
			headerRow.createEl("th", { text: heading });
		}

		const tbody = table.createEl("tbody");
		for (const row of rows) {
			const tr = tbody.createEl("tr");
			tr.createEl("td", { text: row.param });
			tr.createEl("td", { text: row.accepts });
			tr.createEl("td", { text: row.default });
			tr.createEl("td", { text: row.notes });
		}
	}
}
