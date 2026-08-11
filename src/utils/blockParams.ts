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

/**
 * Tri-state boolean for filter params: true/yes/1 → true, false/no/0 → false,
 * any/all → undefined (explicitly no filter), unset/unrecognized → defaultValue.
 */
export function parseTriStateBool(value: string | undefined, defaultValue: boolean | undefined): boolean | undefined {
	const normalized = value?.trim().toLowerCase();
	if (normalized === undefined || normalized === "") return defaultValue;
	if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
	if (normalized === "false" || normalized === "no" || normalized === "0") return false;
	if (normalized === "any" || normalized === "all") return undefined;
	return defaultValue;
}

/** Comma-separated list value, trimmed and with empty segments dropped. */
export function parseListParam(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);
}

/** Returns the value of the first of `keys` present (non-empty) in `params`. */
export function pickFirstPresentParam(params: Record<string, string>, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = params[key];
		if (value !== undefined && value.trim() !== "") return value;
	}
	return undefined;
}

/** Normalizes a case-insensitive asc/desc value to the "ASC"/"DESC" casing Issues/Rocks expect. */
export function normalizeOrderUpper(value: string | undefined, defaultValue: "ASC" | "DESC"): "ASC" | "DESC" {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "asc") return "ASC";
	if (normalized === "desc") return "DESC";
	return defaultValue;
}

/** Normalizes a case-insensitive asc/desc value to the "asc"/"desc" casing To-Dos expects. */
export function normalizeOrderLower(value: string | undefined, defaultValue: "asc" | "desc"): "asc" | "desc" {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "asc") return "asc";
	if (normalized === "desc") return "desc";
	return defaultValue;
}
