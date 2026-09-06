import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { decodePicker, verifyPickerRelease } from "./picker-release.mjs";

function fixture(value) {
  const raw = Buffer.from(JSON.stringify(value));
  const compressed = gzipSync(raw);
  const digest = createHash("sha256").update(raw).digest("hex");
  return {
    compressed,
    entry: {
      digest,
      filename: `picker-release-${digest}.json.gz`,
      bytes: raw.length,
      compressedBytes: compressed.length,
    },
  };
}
test("both checked-in MCP list artifacts match their manifest and size limits", async () => {
  assert.equal(Object.keys((await verifyPickerRelease()).pickers).length, 2);
});
test("picker release rejects changed bytes, traversal, wrong payload and decompression bombs", () => {
  const data = { script: "export {};", style: ".app{}" };
  const { entry, compressed } = fixture(data);
  assert.deepEqual(decodePicker(entry, compressed), data);
  assert.throws(() =>
    decodePicker({ ...entry, digest: "a".repeat(64) }, compressed),
  );
  assert.throws(() =>
    decodePicker({ ...entry, filename: "../../secret" }, compressed),
  );
  assert.throws(() => decodePicker(entry, compressed.subarray(1)));
  assert.throws(
    () => decodePicker({ ...entry, bytes: entry.bytes + 1 }, compressed),
    /integrity/,
  );
  const wrong = fixture({ script: 1, style: "" });
  assert.throws(() => decodePicker(wrong.entry, wrong.compressed), /payload/);
  const huge = fixture({ script: "a".repeat(5_000_001), style: "" });
  assert.throws(() =>
    decodePicker({ ...huge.entry, bytes: 10 }, huge.compressed),
  );
});
