/**
 * Renders an item description for display, keeping its formatting.
 *
 * Descriptions from Ninety's rich text editor are raw HTML written by anyone on the
 * team, so the HTML is never inserted as-is. It's parsed with DOMParser (an inert
 * document — nothing runs or loads) and rebuilt node by node from an allowlist:
 * known formatting tags are recreated with no attributes, unknown tags are unwrapped
 * (their text is kept), dangerous/embedded content is dropped with its contents, and
 * the only attribute ever copied is a validated http(s)/mailto link target.
 */

/** Recreated as-is (no attributes). */
const KEPT_TAGS = new Set([
	"p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike", "del", "sub", "sup",
	"code", "pre", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
]);

/** Dropped along with everything inside them — never unwrapped, since their content isn't prose. */
const DROPPED_TAGS = new Set([
	"script", "style", "iframe", "object", "embed", "img", "svg", "math", "video", "audio",
	"link", "meta", "template", "noscript", "form", "input", "button", "textarea", "select",
]);

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function safeHref(raw: string | null): string | null {
	if (!raw) return null;
	try {
		const url = new URL(raw.trim());
		return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

function appendSanitized(node: Node, parentEl: HTMLElement): void {
	if (node.nodeType === Node.TEXT_NODE) {
		parentEl.appendText(node.textContent ?? "");
		return;
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return;

	const source = node as Element;
	const tag = source.tagName.toLowerCase();

	if (DROPPED_TAGS.has(tag)) return;

	let target = parentEl;
	if (KEPT_TAGS.has(tag)) {
		target = parentEl.createEl(tag as keyof HTMLElementTagNameMap);
	} else if (tag === "a") {
		const href = safeHref(source.getAttribute("href"));
		if (href) target = parentEl.createEl("a", { cls: "external-link", attr: { href } });
	}
	// Anything else (span, font, unknown tags): fall through with target = parentEl, i.e. unwrap.

	source.childNodes.forEach((child) => appendSanitized(child, target));
}

/**
 * Returns a detached `<div>` holding the rendered description, or null if there's nothing
 * visible to show (empty, whitespace-only, or e.g. just an image or empty paragraphs).
 * A description with no markup at all (e.g. one this plugin wrote for a To-Do) is shown
 * verbatim with its line breaks kept.
 */
export function renderDescription(raw: string | undefined): HTMLElement | null {
	if (!raw?.trim()) return null;

	const el = createDiv({ cls: "ninety-command-rich" });

	if (/<[a-z!/][^>]*>/i.test(raw)) {
		const doc = new DOMParser().parseFromString(raw, "text/html");
		doc.body.childNodes.forEach((child) => appendSanitized(child, el));
	} else {
		el.addClass("is-plain");
		el.setText(raw.trim());
	}

	return el.textContent?.trim() ? el : null;
}
