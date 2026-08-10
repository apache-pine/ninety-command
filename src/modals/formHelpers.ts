import { type ButtonComponent, Notice, type Setting } from "obsidian";
import { describeApiError, NinetyApiError } from "../api/errors";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { CompanyUserResponseDTO } from "../api/resources/users";

/** Wires a native date input onto a Setting's text component. */
export function addDateField(setting: Setting, initialValue: string, onChange: (value: string) => void): void {
	setting.addText((text) => {
		text.inputEl.type = "date";
		text.setValue(initialValue).onChange(onChange);
	});
}

export interface TeamDropdownOptions {
	defaultTeamId: string | null;
	/** To-Dos only: adds a leading "Personal (no team)" option mapped to "". */
	allowPersonal?: boolean;
}

/** Populates a team dropdown from the cached available-teams list. */
export function addTeamDropdown(
	setting: Setting,
	teams: AvailableTeamResponseDTO[],
	opts: TeamDropdownOptions,
	onChange: (teamId: string) => void,
): void {
	setting.addDropdown((dropdown) => {
		if (opts.allowPersonal) {
			dropdown.addOption("", "Personal (no team)");
		} else {
			dropdown.addOption("", "Select a team…");
		}

		for (const team of teams) {
			const label = team.isMember ? team.name : `${team.name} (not a member)`;
			dropdown.addOption(team._id, label);
		}

		const initial = opts.defaultTeamId && teams.some((t) => t._id === opts.defaultTeamId) ? opts.defaultTeamId : "";
		dropdown.setValue(initial);
		onChange(initial);
		dropdown.onChange(onChange);
	});
}

/**
 * Populates an assignee dropdown, defaulting to "unassigned" (the API assigns
 * the caller) unless `initialUserId` names a currently-active user.
 */
export function addUserDropdown(
	setting: Setting,
	users: CompanyUserResponseDTO[],
	onChange: (userId: string) => void,
	initialUserId?: string,
): void {
	setting.addDropdown((dropdown) => {
		dropdown.addOption("", "Unassigned (assigned to you)");

		for (const user of users.filter((u) => u.active)) {
			const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
			const label = name || user.primaryEmail || user.id;
			dropdown.addOption(user.id, label);
		}

		const initial = initialUserId && users.some((u) => u.id === initialUserId) ? initialUserId : "";
		dropdown.setValue(initial);
		dropdown.onChange(onChange);
	});
}

/**
 * Centralizes the submit-button lifecycle shared by every capture modal:
 * busy state, error surfacing via describeApiError, and restoring the button.
 * The caller's `action` is responsible for its own validation, the API call,
 * a success Notice, and closing the modal.
 */
export async function runSubmit(button: ButtonComponent, busyLabel: string, action: () => Promise<void>): Promise<void> {
	const originalLabel = button.buttonEl.textContent ?? "";
	button.setDisabled(true).setButtonText(busyLabel);

	try {
		await action();
	} catch (err) {
		const message = err instanceof NinetyApiError ? describeApiError(err) : "Ninety.io: request failed.";
		new Notice(message);
	} finally {
		button.setDisabled(false).setButtonText(originalLabel);
	}
}
