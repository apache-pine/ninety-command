export class CommandApiError extends Error {
	status: number;
	body: string;
	path: string;

	constructor(status: number, body: string, path: string, message?: string) {
		super(message ?? `Ninety.io request to ${path} failed (HTTP ${status})`);
		this.name = "CommandApiError";
		this.status = status;
		this.body = body;
		this.path = path;
	}
}

const MAX_BODY_EXCERPT = 200;

/** Maps a CommandApiError to short, user-facing copy suitable for a Notice. */
export function describeApiError(err: CommandApiError): string {
	switch (err.status) {
		case 0:
			return "Ninety Command: couldn't reach the API — check your connection.";
		case 401:
			return "Ninety Command: your API token is invalid or expired. Update it in Settings → Ninety Command.";
		case 403:
			return "Ninety Command: your token doesn't have permission for this request.";
		case 404:
			return "Ninety Command: that item couldn't be found.";
		case 429:
			return "Ninety Command: rate limited by the API — try again in a moment.";
		default: {
			const excerpt =
				err.body.length > MAX_BODY_EXCERPT ? `${err.body.slice(0, MAX_BODY_EXCERPT)}…` : err.body;
			return excerpt
				? `Ninety Command: request failed (HTTP ${err.status}). ${excerpt}`
				: `Ninety Command: request failed (HTTP ${err.status}).`;
		}
	}
}
