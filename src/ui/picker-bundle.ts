import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import release from "./picker-release.generated.json" with { type: "json" };

export type PickerName = keyof typeof release.pickers;
export function pickerUri(name: PickerName): string {
  return `ui://applaunchflow/${name}-${release.pickers[name].digest}.html`;
}
type Bundle = { script: string; style: string };
const bundles = new Map<PickerName, Promise<Bundle>>();

/** Bounded public, immutable UI payloads; no user data or credentials. */
export function loadPickerBundle(name: PickerName): Promise<Bundle> {
  let pending = bundles.get(name);
  if (pending) return pending;
  pending = (async () => {
    const entry = release.pickers[name];
    if (
      !/^[a-f0-9]{64}$/.test(entry.digest) ||
      entry.filename !== `picker-release-${entry.digest}.json.gz` ||
      entry.bytes > 5_000_000 ||
      entry.compressedBytes > 2_000_000
    )
      throw new Error("Invalid picker release descriptor");
    const packed = await readFile(
      new URL(`../../picker-release/${entry.filename}`, import.meta.url),
    );
    if (packed.length !== entry.compressedBytes)
      throw new Error("Truncated picker release");
    const bytes = gunzipSync(packed, { maxOutputLength: 5_000_000 });
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.digest
    )
      throw new Error("Picker release integrity mismatch");
    const bundle: unknown = JSON.parse(bytes.toString("utf8"));
    if (
      !bundle ||
      typeof bundle !== "object" ||
      !("script" in bundle) ||
      typeof bundle.script !== "string" ||
      !("style" in bundle) ||
      typeof bundle.style !== "string"
    )
      throw new Error("Invalid picker bundle");
    return { script: bundle.script, style: bundle.style };
  })();
  bundles.set(name, pending);
  void pending.catch(() => bundles.delete(name));
  return pending;
}
