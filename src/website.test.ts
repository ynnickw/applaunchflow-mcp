import assert from "node:assert/strict";
import test from "node:test";
import { mergeWebsitePages } from "./tools/website.js";

const document = {
  hero: { headline: "Keep me" },
  links: { websiteUrl: "https://example.com", contactEmail: "old@example.com" },
  legal: { privacy: "old privacy", terms: "old terms", support: "old support" },
  seo: { title: "Old title", description: "Old description" },
};

test("website pages merge only the supplied fields", () => {
  const merged = mergeWebsitePages(document, {
    privacyPolicy: "# Privacy",
    links: { contactEmail: "new@example.com" },
    seo: { title: "New title" },
  });
  assert.deepEqual(merged, {
    hero: { headline: "Keep me" },
    links: { websiteUrl: "https://example.com", contactEmail: "new@example.com" },
    legal: { privacy: "# Privacy", terms: "old terms", support: "old support" },
    seo: { title: "New title", description: "Old description" },
  });
});

test("empty strings clear a page or link on purpose", () => {
  const merged = mergeWebsitePages(document, {
    support: "",
    links: { websiteUrl: "" },
  });
  assert.equal(merged.legal.support, "");
  assert.equal(merged.links.websiteUrl, "");
});
