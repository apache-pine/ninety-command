/**
 * Converts a native <input type="date"> value ("YYYY-MM-DD") into the ISO 8601
 * datetime Rocks/Milestones expect. Treated as end-of-day UTC rather than
 * midnight, so an item due "today" doesn't immediately read as overdue in
 * timezones behind UTC.
 */
export function dateInputToEndOfDayUtcIso(value: string): string {
	return `${value}T23:59:59.999Z`;
}

/** Best-guess calendar quarter for today's date — always editable before submit. */
export function getCalendarQuarter(date: Date = new Date()): "Q1" | "Q2" | "Q3" | "Q4" {
	const month = date.getMonth(); // 0-based
	if (month < 3) return "Q1";
	if (month < 6) return "Q2";
	if (month < 9) return "Q3";
	return "Q4";
}
