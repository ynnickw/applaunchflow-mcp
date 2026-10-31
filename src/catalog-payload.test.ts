import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { packCatalogPayload } from "./ui/catalog-payload.js";

test("large private catalogs compress losslessly, with UTF-8 length and integrity", () => {
  const payload = {
    layouts: Array.from({ length: 1000 }, () => ({
      text: "A & B < C – 日本語",
      imageUrl: "https://example.invalid/image?x=1&y=2",
      screens: "fixture ".repeat(1000),
    })),
  };
  const packed = packCatalogPayload(payload);
  const bytes = gunzipSync(Buffer.from(packed.payloadGzipBase64, "base64"));
  assert.deepEqual(JSON.parse(bytes.toString("utf8")), payload);
  assert.equal(bytes.length, packed.payloadBytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    packed.payloadSha256,
  );
  assert.ok(packed.payloadGzipBase64.length < packed.payloadBytes / 20);
  assert.equal(packed.payloadGzipBase64.includes("https://"), false);
});

test("catalog packer rejects unbounded inline data", () => {
  assert.throws(
    () => packCatalogPayload({ data: "x".repeat(32 * 1024 * 1024) }),
    /too large/,
  );
});
