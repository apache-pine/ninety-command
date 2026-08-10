import type { App } from "obsidian";

export interface CapturePrefill {
	title: string;
	description: string;
}

/**
 * Prefills a capture modal from the active editor's selection, if any.
 * First non-blank line becomes the title; the rest becomes the description.
 */
export function getPrefillFromSelection(app: App): CapturePrefill {
	const selection = app.workspace.activeEditor?.editor?.getSelection() ?? "";
	const lines = selection
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return { title: "", description: "" };
	}

	const [title, ...rest] = lines;
	return { title, description: rest.join("\n") };
}
