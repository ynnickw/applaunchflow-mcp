/** Node 24. Run: node examples/release.mjs release.json release.zip */
import { readFile, writeFile } from "node:fs/promises";
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
const releaseKey = createHash("sha256")
  .update(process.env.APPLAUNCHFLOW_RELEASE_ID)
  .digest("hex");
const render = await client.createRender(
  {
    projectId: config.projectId,
    ...(config.variantId ? { variantId: config.variantId } : {}),
    formats: config.formats,
    languages: config.languages,
    package: "fastlane",
  },
  releaseKey,
);
await writeFile(
  `${outputPath}.receipt.json`,
  JSON.stringify(
    {
      renderId: render.id,
      projectId: config.projectId,
      variantId: render.variantId,
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
if (
  manifest.projectId !== config.projectId ||
  manifest.variantId !== render.variantId
)
  throw new Error("Package project or variant mismatch");
await client.downloadPackage(render.id, outputPath);
console.log(
  `Validated ${manifest.files.length} screenshots. Saved ${outputPath}.`,
);
