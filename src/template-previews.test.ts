import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateGalleryUrl } from "./template-previews.js";

test("personalized gallery URLs carry the generated catalog and direct-apply action", () => {
  const url = new URL(
    buildTemplateGalleryUrl("https://dashboard.applaunchflow.com", {
      deviceType: "phone",
      templateIds: ["bold-frame", "minimal-clean"],
      generationId: "11111111-1111-4111-8111-111111111111",
      catalogKey: "catalog-key",
      applySelection: true,
    }),
  );

  assert.equal(url.pathname, "/template-gallery");
  assert.equal(url.searchParams.get("device"), "phone");
  assert.equal(url.searchParams.get("ids"), "bold-frame,minimal-clean");
  assert.equal(
    url.searchParams.get("generationId"),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(url.searchParams.get("catalogKey"), "catalog-key");
  assert.equal(url.searchParams.get("action"), "apply");
});
