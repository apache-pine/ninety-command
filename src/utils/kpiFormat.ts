import type { KpiCurrency, KpiUnit } from "../api/resources/scorecard";

const CURRENCY_SYMBOLS: Record<KpiCurrency, string> = {
	USD: "$",
	AUD: "A$",
	CAD: "C$",
	EUR: "€",
	GBP: "£",
};

/** Formats a Measurable's value according to its unit/currency, for display. */
export function formatKpiValue(value: number | null | undefined, unit: KpiUnit, currency?: KpiCurrency): string {
	if (value == null) return "No score";

	switch (unit) {
		case "percentage":
			return `${value}%`;
		case "dollar":
		case "euro":
		case "pound":
			return `${currency ? CURRENCY_SYMBOLS[currency] : "$"}${value}`;
		case "yesno":
			return value ? "Yes" : "No";
		default:
			return String(value);
	}
}
