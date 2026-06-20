// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/manifest.json"), "utf8"),
);

// Permissions Chrome flags as requiring extra review / broader access. The
// extension's single purpose needs none of these.
const FORBIDDEN_PERMISSIONS = [
  "tabs",
  "activeTab",
  "scripting",
  "webRequest",
  "<all_urls>",
  "background",
  "cookies",
  "history",
];

describe("manifest permissions stay minimal", () => {
  it("requests only the storage permission", () => {
    expect(manifest.permissions).toEqual(["storage"]);
  });

  it("scopes host access to claude.ai only", () => {
    expect(manifest.host_permissions).toEqual(["https://claude.ai/*"]);
  });

  it("requests no broad or review-triggering permissions", () => {
    const all = [
      ...(manifest.permissions ?? []),
      ...(manifest.host_permissions ?? []),
      ...(manifest.optional_permissions ?? []),
    ];
    for (const forbidden of FORBIDDEN_PERMISSIONS) {
      expect(all).not.toContain(forbidden);
    }
    expect(all).not.toContain("http://*/*");
    expect(all).not.toContain("https://*/*");
  });

  it("declares no remotely hosted code", () => {
    // MV3 forbids it, but assert the field is absent so a regression is caught.
    expect(manifest.content_security_policy?.extension_pages ?? "").not.toMatch(
      /https?:\/\//,
    );
  });
});
