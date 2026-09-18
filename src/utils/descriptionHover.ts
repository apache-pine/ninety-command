import { renderDescription } from "./richDescription";

const SHOW_DELAY_MS = 400;
const VIEWPORT_MARGIN = 8;
const ROW_GAP = 4;

// Only one card is ever visible (the pointer can only be over one row), so a
// single module-level slot is enough and makes teardown trivial.
let cardEl: HTMLElement | null = null;
let removeCardListeners: (() => void) | null = null;

export function hideDescriptionCard(): void {
	removeCardListeners?.();
	removeCardListeners = null;
	cardEl?.remove();
	cardEl = null;
}

/**
 * Shows the rendered description in a floating card after the mouse rests on `rowEl` for a moment.
 * Mouse-only (`pointerType === "mouse"`): touch devices emit compatibility hover
 * events on tap, which would leave a card stuck on screen with no way to dismiss it.
 */
export function attachDescriptionHover(rowEl: HTMLElement, rawDescription: string | undefined): void {
	let timer: number | undefined;

	const cancelPending = (): void => {
		if (timer === undefined) return;
		rowEl.win.clearTimeout(timer);
		timer = undefined;
	};

	rowEl.addEventListener("pointerenter", (evt) => {
		if (evt.pointerType !== "mouse") return;
		cancelPending();
		timer = rowEl.win.setTimeout(() => {
			timer = undefined;
			if (rowEl.isConnected) showCard(rowEl, rawDescription);
		}, SHOW_DELAY_MS);
	});

	const dismiss = (): void => {
		cancelPending();
		hideDescriptionCard();
	};
	rowEl.addEventListener("pointerleave", dismiss);
	// Clicking a row action (complete/edit/delete) is about to change or remove the row.
	rowEl.addEventListener("pointerdown", dismiss);
}

function showCard(rowEl: HTMLElement, rawDescription: string | undefined): void {
	hideDescriptionCard();

	const content = renderDescription(rawDescription);
	if (!content) return;

	const { doc, win } = rowEl;
	const card = doc.body.createDiv({ cls: "ninety-command-description-card" });
	card.appendChild(content);
	cardEl = card;

	const rowRect = rowEl.getBoundingClientRect();
	const cardRect = card.getBoundingClientRect();

	const maxLeft = win.innerWidth - cardRect.width - VIEWPORT_MARGIN;
	const left = Math.max(VIEWPORT_MARGIN, Math.min(rowRect.left, maxLeft));

	const below = rowRect.bottom + ROW_GAP;
	const fitsBelow = below + cardRect.height + VIEWPORT_MARGIN <= win.innerHeight;
	const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rowRect.top - ROW_GAP - cardRect.height);

	card.style.left = `${left}px`;
	card.style.top = `${top}px`;

	// pointerleave/pointerdown cover the normal cases; these catch the row being
	// re-rendered out from under a visible card (no leave event fires for a removed
	// element) and scrolling, which moves the row away from the fixed-position card.
	const onMouseMove = (evt: MouseEvent): void => {
		if (!rowEl.isConnected || !rowEl.contains(evt.target as Node | null)) hideDescriptionCard();
	};
	const onScroll = (): void => hideDescriptionCard();
	doc.addEventListener("mousemove", onMouseMove, { passive: true });
	win.addEventListener("scroll", onScroll, { capture: true, passive: true });
	removeCardListeners = () => {
		doc.removeEventListener("mousemove", onMouseMove);
		win.removeEventListener("scroll", onScroll, { capture: true });
	};
}
