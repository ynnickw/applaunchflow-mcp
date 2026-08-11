import assert from "node:assert/strict";
import test from "node:test";
import { buildSocialTemplateGalleryUrl } from "./social-template-previews.js";

test("personalized social gallery URLs use the direct-apply flow", () => {
  const url = new URL(
    buildSocialTemplateGalleryUrl("https://dashboard.applaunchflow.com", {
      format: "og",
      templateIds: ["social-orbit", "social-dark"],
      generationId: "11111111-1111-4111-8111-111111111111",
      catalogKey: "catalog-key",
      applySelection: true,
    }),
  );

  assert.equal(url.pathname, "/template-gallery");
  assert.equal(url.searchParams.get("kind"), "social");
  assert.equal(url.searchParams.get("format"), "og");
  assert.equal(url.searchParams.get("ids"), "social-orbit,social-dark");
  assert.equal(url.searchParams.get("action"), "apply");
});
