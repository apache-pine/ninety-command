import { attachDescriptionHover } from "./utils/descriptionHover";
import { renderDescription } from "./utils/richDescription";

export interface RowDescriptionOptions {
	/** Render the description under the row's title, clamped to `lineLimit` lines. */
	inline: boolean;
	/** Show the full description in a floating card while the mouse is over the row. Independent of `inline`. */
	hover: boolean;
	/** Max lines for the inline description; 0 = show it all. */
	lineLimit: number;
}

/**
 * Adds a row's description (inline and/or hover card) to `rowEl`. Call after the row's
 * own content is rendered and before its action buttons are appended, so the inline
 * text sits between them. No-ops for items with no (or nothing visible in their) description.
 */
export function applyRowDescription(rowEl: HTMLElement, rawDescription: string | undefined, opts: RowDescriptionOptions): void {
	const descEl = renderDescription(rawDescription);
	if (!descEl) return;

	if (opts.inline) {
		descEl.addClass("ninety-command-item-description");
		rowEl.appendChild(descEl);
		if (opts.lineLimit > 0) clampDescription(descEl, opts.lineLimit);
		openLinksExternally(descEl);
	}

	// The card renders its own copy from the raw text when shown, so it's never a
	// clone of an already-clamped inline element and costs nothing until first hover.
	if (opts.hover) attachDescriptionHover(rowEl, rawDescription);
}

function clampDescription(descEl: HTMLElement, lineLimit: number): void {
	descEl.addClass("is-clamped");
	descEl.style.setProperty("--ninety-command-description-lines", String(lineLimit));

	// Only fade the bottom edge when something is actually cut off. Needs layout, so wait a frame.
	descEl.win.requestAnimationFrame(() => {
		if (descEl.scrollHeight > descEl.clientHeight + 1) descEl.addClass("is-truncated");
	});
}

/** Rendered links carry a validated absolute URL; hand it to the system browser instead of navigating the app. */
function openLinksExternally(descEl: HTMLElement): void {
	descEl.addEventListener("click", (evt) => {
		const link = (evt.target as Element | null)?.closest("a[href]");
		if (!link) return;
		evt.preventDefault();
		evt.stopPropagation();
		descEl.win.open((link as HTMLAnchorElement).href, "_blank");
	});
}
