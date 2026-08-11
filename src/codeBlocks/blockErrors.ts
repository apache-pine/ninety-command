/** Thrown by context/param resolution when a code block's params can't be satisfied. */
export class BlockParamError extends Error {}

export function teamResolutionFailedMessage(teamParam?: string): string {
	return teamParam
		? `Ninety.io: team "${teamParam}" not found.`
		: "Ninety.io: no team specified and no default team set in Settings → Ninety.io.";
}

export function userNotFoundMessage(value: string): string {
	return `Ninety.io: no user found matching "${value}".`;
}
