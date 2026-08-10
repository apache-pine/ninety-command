/**
 * Forgiving `key: value` line parser for code-block sources — not YAML.
 * Blank lines are ignored; lines without a `:` are ignored rather than
 * erroring, so a stray line doesn't fail the whole block. Keys are
 * lowercased; values are trimmed with case preserved.
 */
export function parseBlockParams(source: string): Record<string, string> {
	const result: Record<string, string> = {};

	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();
		if (!line) continue;

		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim().toLowerCase();
		const value = line.slice(colonIndex + 1).trim();
		if (key) {
			result[key] = value;
		}
	}

	return result;
}
