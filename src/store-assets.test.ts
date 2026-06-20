// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = `${resolve(process.cwd(), "store-assets")}/`;

const EXPECTED_FILES = [
  "short-description.txt",
  "description.md",
  "privacy-practices.md",
  "review-notes.md",
  "screenshot-plan.md",
];

describe("Chrome Web Store assets", () => {
  it.each(EXPECTED_FILES)("has a non-empty %s", (name) => {
    const path = `${dir}${name}`;
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8").trim().length).toBeGreaterThan(0);
  });

  it("keeps the short description within the store's 132-character limit", () => {
    const text = readFileSync(`${dir}short-description.txt`, "utf8").trim();
    expect(text.length).toBeLessThanOrEqual(132);
  });
});
