import { type App, type FuzzyMatch, FuzzySuggestModal } from "obsidian";
import type { AvailableTeamResponseDTO } from "../api/resources/teams";
import type { RockResponseDTO } from "../api/resources/rocks";

/**
 * Picks an existing Rock to attach a Milestone to. FuzzySuggestModal's
 * getItems()/getItemText() are synchronous, so the Rock (and team) list must
 * be fetched *before* this modal is constructed — see main.ts's
 * "Add Milestone to Rock" command handler.
 */
export class RockPickerModal extends FuzzySuggestModal<RockResponseDTO> {
	private teamNameById = new Map<string, string>();

	constructor(
		app: App,
		private rocks: RockResponseDTO[],
		teams: AvailableTeamResponseDTO[],
		private onChoose: (rock: RockResponseDTO) => void,
	) {
		super(app);
		this.setPlaceholder("Type to search Rocks…");
		for (const team of teams) {
			this.teamNameById.set(team._id, team.name);
		}
	}

	getItems(): RockResponseDTO[] {
		return this.rocks;
	}

	getItemText(rock: RockResponseDTO): string {
		const teamName = this.teamNameById.get(rock.teamId) ?? "";
		return `${rock.title} ${teamName}`;
	}

	renderSuggestion(match: FuzzyMatch<RockResponseDTO>, el: HTMLElement): void {
		const rock = match.item;
		el.createDiv({ text: rock.title });
		const teamName = this.teamNameById.get(rock.teamId) ?? "Unknown team";
		el.createDiv({
			text: `${teamName} · ${rock.statusCode} · ${rock.quarter}`,
			cls: "ninety-picker-sub",
		});
	}

	onChooseItem(rock: RockResponseDTO): void {
		this.onChoose(rock);
	}
}
