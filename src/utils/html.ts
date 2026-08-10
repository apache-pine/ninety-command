/**
 * Best-effort HTML → editable-plaintext conversion for prefilling an edit
 * form from a description Ninety returns as raw HTML. Only strips <br> line
 * breaks (round-trips cleanly for descriptions this plugin itself authored);
 * any other markup from Ninety's own rich text editor is left as-is rather
 * than attempting a full HTML-to-Markdown conversion.
 */
export function htmlDescriptionToEditable(html: string | undefined): string {
	if (!html) return "";
	return html.replace(/<br\s*\/?>/gi, "\n");
}
