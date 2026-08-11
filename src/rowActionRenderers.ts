import { Notice, setIcon } from "obsidian";
import type { IssueResponseDTO } from "./api/resources/issues";
import type { RockResponseDTO } from "./api/resources/rocks";
import type { TodoResponseDTO } from "./api/resources/todos";
import { confirmDelete } from "./modals/ConfirmModal";
import { CreateIssueModal } from "./modals/CreateIssueModal";
import { CreateRockModal } from "./modals/CreateRockModal";
import { CreateTodoModal } from "./modals/CreateTodoModal";
import { runRowAction } from "./modals/rowActions";
import type CommandPlugin from "./main";

/**
 * Shared complete/edit/delete row-action builders, used by both the sidebar
 * panel (always) and code blocks (opt-in via an `interactive: true` param).
 * `onChanged` is called after a successful complete/delete so the caller can
 * re-render whatever list the row came from (a CommandSection.refresh() for
 * the sidebar, or the block's own render() for code blocks).
 */

function addRowActionButton(actionsEl: HTMLElement, icon: string, label: string): HTMLButtonElement {
	const btn = actionsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label, title: label } });
	setIcon(btn, icon);
	return btn;
}

export function renderIssueRowActions(
	plugin: CommandPlugin,
	issue: IssueResponseDTO,
	actionsEl: HTMLElement,
	onChanged: () => void,
): void {
	const completeBtn = addRowActionButton(actionsEl, "check", "Mark complete");
	completeBtn.addEventListener("click", () => {
		void runRowAction(completeBtn, async () => {
			await plugin.apiClient.issues.update(issue._id, { completed: true });
			new Notice(`Ninety Command: Issue "${issue.title}" completed.`);
			onChanged();
		});
	});

	const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
	editBtn.addEventListener("click", () => {
		new CreateIssueModal(plugin.app, plugin, { mode: "edit", issue }, onChanged).open();
	});

	const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
	deleteBtn.addEventListener("click", () => {
		void (async () => {
			const confirmed = await confirmDelete(plugin.app, `Delete Issue "${issue.title}"? This can't be undone.`);
			if (!confirmed) return;
			void runRowAction(deleteBtn, async () => {
				await plugin.apiClient.issues.delete(issue._id);
				new Notice(`Ninety Command: Issue "${issue.title}" deleted.`);
				onChanged();
			});
		})();
	});
}

export function renderTodoRowActions(
	plugin: CommandPlugin,
	todo: TodoResponseDTO,
	actionsEl: HTMLElement,
	onChanged: () => void,
): void {
	const completeBtn = addRowActionButton(actionsEl, "check", "Mark complete");
	completeBtn.addEventListener("click", () => {
		void runRowAction(completeBtn, async () => {
			await plugin.apiClient.todos.update(todo._id, { completed: true });
			new Notice(`Ninety Command: To-Do "${todo.title}" completed.`);
			onChanged();
		});
	});

	const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
	editBtn.addEventListener("click", () => {
		new CreateTodoModal(plugin.app, plugin, { mode: "edit", todo }, onChanged).open();
	});

	const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
	deleteBtn.addEventListener("click", () => {
		void (async () => {
			const confirmed = await confirmDelete(plugin.app, `Delete To-Do "${todo.title}"? This can't be undone.`);
			if (!confirmed) return;
			void runRowAction(deleteBtn, async () => {
				await plugin.apiClient.todos.delete(todo._id);
				new Notice(`Ninety Command: To-Do "${todo.title}" deleted.`);
				onChanged();
			});
		})();
	});
}

export function renderRockRowActions(
	plugin: CommandPlugin,
	rock: RockResponseDTO,
	actionsEl: HTMLElement,
	onChanged: () => void,
): void {
	const completeBtn = addRowActionButton(actionsEl, "check", "Mark done");
	completeBtn.addEventListener("click", () => {
		void runRowAction(completeBtn, async () => {
			await plugin.apiClient.rocks.update(rock._id, { statusCode: "DONE" });
			new Notice(`Ninety Command: Rock "${rock.title}" marked done.`);
			onChanged();
		});
	});

	const editBtn = addRowActionButton(actionsEl, "pencil", "Edit");
	editBtn.addEventListener("click", () => {
		new CreateRockModal(plugin.app, plugin, { mode: "edit", rock }, onChanged).open();
	});

	const deleteBtn = addRowActionButton(actionsEl, "trash-2", "Delete");
	deleteBtn.addEventListener("click", () => {
		void (async () => {
			const confirmed = await confirmDelete(plugin.app, `Delete Rock "${rock.title}"? This can't be undone.`);
			if (!confirmed) return;
			void runRowAction(deleteBtn, async () => {
				await plugin.apiClient.rocks.delete(rock._id);
				new Notice(`Ninety Command: Rock "${rock.title}" deleted.`);
				onChanged();
			});
		})();
	});
}
