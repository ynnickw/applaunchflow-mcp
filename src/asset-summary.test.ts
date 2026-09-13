import assert from "node:assert/strict";
import test from "node:test";
import { assetSummary } from "./tools/asset-summary.js";
test("asset summaries remove signed URL aliases and nested secrets without removing relative paths", () => {
  const input = { illustrations: [{ path: "illustrations/a.png", signedUrl: "https://storage.test/file?token=secret", url: "https://storage.test/file?token=secret", metadata: { previewUrl: "https://storage.test/file?token=secret" } }], website: "https://example.com" };
  assert.deepEqual(assetSummary(input), { illustrations: [{ path: "illustrations/a.png", metadata: {} }], website: "https://example.com" });
  assert.match(JSON.stringify(input), /secret/);
});
