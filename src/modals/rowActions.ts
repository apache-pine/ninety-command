import { Notice } from "obsidian";
import { describeApiError, CommandApiError } from "../api/errors";

/**
 * Lifecycle helper for a plain row-level action button (complete/edit/delete),
 * mirroring formHelpers.ts's runSubmit but for a bare HTMLButtonElement rather
 * than a ButtonComponent inside a form.
 */
export async function runRowAction(button: HTMLButtonElement, action: () => Promise<void>): Promise<void> {
	button.disabled = true;
	try {
		await action();
	} catch (err) {
		const message = err instanceof CommandApiError ? describeApiError(err) : "Ninety Command: action failed.";
		new Notice(message);
	} finally {
		button.disabled = false;
	}
}
