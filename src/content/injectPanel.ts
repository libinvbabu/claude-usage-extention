// Panel injection: owns a single shadow-DOM-isolated React root mounted after
// Claude's native usage section. Shadow DOM keeps our styles from leaking into
// claude.ai and Claude's styles from breaking ours.

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import panelCss from "../styles/panel.css?inline";
import { UsagePacePanel, type UsagePacePanelProps } from "../ui/UsagePacePanel";

export const PANEL_HOST_ID = "claude-usage-pace-root";

let root: Root | null = null;
let container: HTMLElement | null = null;

function buildHost(anchor: HTMLElement | null): void {
  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;

  if (anchor && anchor.parentNode) {
    anchor.insertAdjacentElement("afterend", host);
  } else {
    document.body.appendChild(host);
  }

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = panelCss;
  shadow.appendChild(style);

  const mount = document.createElement("div");
  shadow.appendChild(mount);

  container = mount;
  root = createRoot(mount);
}

/**
 * Ensure a healthy host+root exists. Recreates it if the page (e.g. an SPA
 * re-render) removed our host. Returns true when it (re)created the root.
 */
function ensureHost(anchor: HTMLElement | null): void {
  const existing = document.getElementById(PANEL_HOST_ID);
  const healthy = existing && existing.shadowRoot && root && container;
  if (healthy) return;

  if (root) {
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    root = null;
    container = null;
  }
  if (existing) existing.remove();
  buildHost(anchor);
}

/** Render (or re-render) the panel, creating the host near `anchor` if needed. */
export function renderPanel(props: UsagePacePanelProps, anchor: HTMLElement | null): void {
  ensureHost(anchor);
  root?.render(createElement(UsagePacePanel, props));
}

/** Remove the panel entirely (used when navigating away from the usage page). */
export function removePanel(): void {
  if (root) {
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    root = null;
  }
  container = null;
  document.getElementById(PANEL_HOST_ID)?.remove();
}

export function panelExists(): boolean {
  return document.getElementById(PANEL_HOST_ID) !== null;
}
