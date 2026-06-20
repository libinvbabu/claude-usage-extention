import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "./UsagePacePanel";

/** Decode the handful of HTML entities React emits for text content. */
function decode(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

describe("Footer", () => {
  it("includes the local-only / no-estimates disclaimer", () => {
    const html = decode(renderToStaticMarkup(createElement(Footer, { lastReadAt: Date.now() })));
    expect(html).toContain("Based on Claude's visible usage bars");
    expect(html).toContain("Local-only");
    expect(html).toContain("No exact message/token estimates");
  });

  it("renders the last-read line", () => {
    const html = renderToStaticMarkup(createElement(Footer, { lastReadAt: Date.now() }));
    expect(html).toContain("Last read from page:");
  });

  it("renders an accessible Re-read button only when a handler is provided", () => {
    const withHandler = renderToStaticMarkup(
      createElement(Footer, { lastReadAt: Date.now(), onReread: () => {} }),
    );
    expect(withHandler).toContain("<button");
    expect(withHandler).toContain('aria-label="Re-read Claude usage from visible page"');
    expect(withHandler).toContain("Re-read");

    const withoutHandler = renderToStaticMarkup(
      createElement(Footer, { lastReadAt: Date.now() }),
    );
    expect(withoutHandler).not.toContain("<button");
  });
});
