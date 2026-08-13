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

/**
 * Confirmed live against the API: sending isPersonal: true to /todos/query or
 * /todos/query/paged always 400s, and no other request shape we tried
 * (teamId: null/"", explicit userId, alternate field names) ever surfaced a
 * personal To-Do through those endpoints either — a personal To-Do fetched
 * directly by id exists and is correct, it just can't be listed. This looks
 * like a gap/bug in Ninety's public API, not something fixable client-side.
 */
export function personalTodosUnsupportedMessage(): string {
	return "Ninety Command: personal: true isn't currently usable — Ninety's public API rejects requests for personal To-Dos and has no other way to list them. This is a limitation on Ninety's end, confirmed by testing directly against the live API, not a bug in this plugin. Personal To-Dos can still be created from the capture command, and viewed in the Ninety app.";
}
