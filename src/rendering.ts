import type { IssueResponseDTO } from "./api/resources/issues";
import type { RockResponseDTO } from "./api/resources/rocks";
import type { TodoResponseDTO } from "./api/resources/todos";

export function renderIssueRow(issue: IssueResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: issue.title, cls: "ninety-item-title" });
	const meta = rowEl.createDiv({ cls: "ninety-picker-sub" });
	meta.createSpan({ text: issue.intervalCode === "LONG_TERM" ? "Long-term" : "Short-term" });
	if (issue.priority && issue.priority > 0) {
		meta.createSpan({ text: ` · Priority ${issue.priority}` });
	}
}

export function renderTodoRow(todo: TodoResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: todo.title, cls: "ninety-item-title" });
	if (todo.dueDate) {
		rowEl.createDiv({
			text: `Due ${new Date(todo.dueDate).toLocaleDateString()}`,
			cls: "ninety-picker-sub",
		});
	}
}

export function renderRockRow(rock: RockResponseDTO, rowEl: HTMLElement): void {
	rowEl.createDiv({ text: rock.title, cls: "ninety-item-title" });
	const meta = rowEl.createDiv({ cls: "ninety-picker-sub" });
	meta.createSpan({ text: rock.statusCode, cls: `ninety-badge ${rockStatusBadgeClass(rock.statusCode)}` });
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
