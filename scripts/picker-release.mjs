import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const pickerNames = ["asset-list", "project-list"];
export function decodePicker(entry, compressed) {
  if (
    !/^[a-f0-9]{64}$/.test(entry.digest) ||
    entry.filename !== `picker-release-${entry.digest}.json.gz` ||
    entry.bytes > 5_000_000 ||
    entry.compressedBytes > 2_000_000 ||
    compressed.length !== entry.compressedBytes
  )
    throw new Error("Invalid picker release descriptor");
  const payload = gunzipSync(compressed, { maxOutputLength: 5_000_000 });
  if (
    payload.length !== entry.bytes ||
    createHash("sha256").update(payload).digest("hex") !== entry.digest
  )
    throw new Error("Picker release integrity mismatch");
  const data = JSON.parse(payload.toString("utf8"));
  if (typeof data.script !== "string" || typeof data.style !== "string")
    throw new Error("Invalid picker release payload");
  return data;
}

export async function verifyPickerRelease(root = process.cwd()) {
  const manifest = JSON.parse(
    await readFile(
      resolve(root, "src/ui/picker-release.generated.json"),
      "utf8",
    ),
  );
  const contracts = await readFile(resolve(root, "src/contracts/index.ts"));
  if (
    createHash("sha256").update(contracts).digest("hex") !==
    manifest.contractsSha256
  )
    throw new Error(
      "Shared contracts changed without rebuilding the picker release. Run sync:dashboard.",
    );
  if (
    manifest.schemaVersion !== 1 ||
    JSON.stringify(Object.keys(manifest.pickers).sort()) !==
      JSON.stringify([...pickerNames].sort())
  )
    throw new Error("Invalid picker manifest");
  for (const entry of Object.values(manifest.pickers)) {
    decodePicker(
      entry,
      await readFile(resolve(root, "picker-release", entry.filename)),
    );
  }
  return manifest;
}

// No network or automatic dependency on another checkout in CI. The reviewed,
// compressed build output travels in npm/Docker alongside its exact manifest.
export async function syncPickerRelease(
  dashboard,
  { check = false, root = process.cwd() } = {},
) {
  const source = resolve(dashboard, "public/mcp-assets");
  const manifestText = await readFile(resolve(source, "release.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  if (
    manifest.schemaVersion !== 1 ||
    pickerNames.some((name) => !manifest.pickers[name])
  )
    throw new Error("Build the dashboard with npm run build:mcp-ui first");
  const artifacts = [];
  for (const name of pickerNames) {
    const entry = manifest.pickers[name];
    if (
      entry.filename !== `picker-release-${entry.digest}.json.gz` ||
      !/^[a-f0-9]{64}$/.test(entry.digest)
    )
      throw new Error("Invalid release filename");
    const compressed = await readFile(resolve(source, entry.filename));
    decodePicker(entry, compressed);
    artifacts.push([
      resolve(root, "picker-release", entry.filename),
      compressed,
    ]);
  }
  artifacts.push([
    resolve(root, "src/ui/picker-release.generated.json"),
    Buffer.from(manifestText),
  ]);
  if (!check) await mkdir(resolve(root, "picker-release"), { recursive: true });
  for (const [path, expected] of artifacts) {
    const current = await readFile(path).catch(() => null);
    if (current?.equals(expected)) continue;
    if (check)
      throw new Error(
        "Picker release is out of sync. Rebuild dashboard, then npm run sync:pickers -- <dashboard-checkout>",
      );
    await writeFile(path, expected);
  }
  if (!check) {
    const keep = new Set(
      Object.values(manifest.pickers).map((entry) => entry.filename),
    );
    for (const file of await readdir(resolve(root, "picker-release"))) {
      if (
        /^picker-release-[a-f0-9]{64}\.json\.gz$/.test(file) &&
        !keep.has(file)
      )
        await unlink(resolve(root, "picker-release", file));
    }
  }
  return verifyPickerRelease(root);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dashboard = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const manifest = dashboard
    ? await syncPickerRelease(dashboard, {
        check: process.argv.includes("--check"),
      })
    : await verifyPickerRelease();
  console.log(
    `Verified ${Object.keys(manifest.pickers).length} pinned picker releases`,
  );
}
