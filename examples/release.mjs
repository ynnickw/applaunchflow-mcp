/** Node 24. Run: node examples/release.mjs release.json release.zip */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { AppLaunchFlow } from "applaunchflow/api";
const [configPath, outputPath] = process.argv.slice(2);
if (
  !configPath ||
  !outputPath ||
  !process.env.APPLAUNCHFLOW_API_KEY ||
  !process.env.APPLAUNCHFLOW_RELEASE_ID
)
  throw new Error(
    "Provide config/output paths, APPLAUNCHFLOW_API_KEY and a stable APPLAUNCHFLOW_RELEASE_ID (preserve it across CI retries).",
  );
const config = JSON.parse(await readFile(configPath, "utf8"));
const client = new AppLaunchFlow({
  baseUrl:
    process.env.APPLAUNCHFLOW_BASE_URL || "https://dashboard.applaunchflow.com",
  token: process.env.APPLAUNCHFLOW_API_KEY,
});
const version = await client.getDesignVersion(config.designVersionId);
if (version.contentHash !== config.designVersionHash)
  throw new Error("The design version must match the pinned content hash.");
const releaseKey = createHash("sha256")
  .update(process.env.APPLAUNCHFLOW_RELEASE_ID)
  .digest("hex");
const uploads = new Map();
const languages = [];
for (const language of config.languages) {
  const captures = {};
  for (const [binding, path] of Object.entries(language.captures)) {
    const file = resolve(dirname(configPath), path);
    const bytes = await readFile(file);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    let asset = uploads.get(checksum);
    if (!asset) {
      asset = await client.uploadCapture(
        version.projectId,
        path,
        bytes,
        /\.png$/i.test(file) ? "image/png" : "image/jpeg",
        `${releaseKey.slice(0, 32)}:${checksum}`,
      );
      uploads.set(checksum, asset);
    }
    captures[binding] = asset.id;
  }
  languages.push({
    locale: language.locale,
    captures,
    copy: language.copy,
    useDefaults: language.useDefaults ?? false,
  });
}
const render = await client.createRender(
  {
    designVersionId: version.id,
    formats: config.formats,
    languages,
    package: "fastlane",
  },
  releaseKey,
);
await writeFile(
  `${outputPath}.receipt.json`,
  JSON.stringify(
    {
      renderId: render.id,
      designVersionId: version.id,
      designVersionHash: version.contentHash,
      idempotencyKey: releaseKey,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `Render ${render.id}. Receipt saved; preserve it when retrying CI.`,
);
await client.waitForRender(render.id);
const manifest = await client.getManifest(render.id);
if (manifest.designVersionHash !== config.designVersionHash)
  throw new Error("Package version mismatch");
await client.downloadPackage(render.id, outputPath);
console.log(
  `Validated ${manifest.files.length} screenshots. Saved ${outputPath}.`,
);
