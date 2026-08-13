import type { IssueResponseDTO } from "./api/resources/issues";
import type { RockResponseDTO } from "./api/resources/rocks";
import type { TodoResponseDTO } from "./api/resources/todos";

export function renderIssueRow(issue: IssueResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: issue.title, cls: "ninety-command-item-title" });
	const meta = rowEl.createDiv({ cls: "ninety-command-picker-sub" });
	meta.createSpan({ text: issue.intervalCode === "LONG_TERM" ? "Long-term" : "Short-term" });
	if (issue.rating && issue.rating > 0) {
		meta.createSpan({ text: ` · Priority ${issue.rating}` });
	}
}

export function renderTodoRow(todo: TodoResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: todo.title, cls: "ninety-command-item-title" });
	if (todo.dueDate) {
		rowEl.createDiv({
			text: `Due ${new Date(todo.dueDate).toLocaleDateString()}`,
			cls: "ninety-command-picker-sub",
		});
	}
}

export function renderRockRow(rock: RockResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: rock.title, cls: "ninety-command-item-title" });
	const meta = rowEl.createDiv({ cls: "ninety-command-picker-sub" });
	meta.createSpan({ text: rock.statusCode, cls: `ninety-command-badge ${rockStatusBadgeClass(rock.statusCode)}` });
	meta.createSpan({ text: ` · ${new Date(rock.dueDate).toLocaleDateString()} · ${rock.quarter}` });
}

function rockStatusBadgeClass(status: RockResponseDTO["statusCode"]): string {
	switch (status) {
		case "ON_TRACK":
		case "DONE":
			return "is-on-track";
		case "OFF_TRACK":
			return "is-off-track";
		default:
			return "is-draft";
	}
}
