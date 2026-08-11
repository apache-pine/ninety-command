/** Thrown by context/param resolution when a code block's params can't be satisfied. */
export class BlockParamError extends Error {}

export function teamResolutionFailedMessage(teamParam?: string): string {
	return teamParam
		? `Ninety Command: team "${teamParam}" not found.`
		: "Ninety Command: no team specified and no default team set in Settings → Ninety Command.";
}

export function userNotFoundMessage(value: string): string {
	return `Ninety Command: no user found matching "${value}".`;
}
