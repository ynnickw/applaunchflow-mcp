import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { syncPickerRelease } from "./picker-release.mjs";

const dashboard = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!dashboard)
  throw new Error(
    "Usage: npm run sync:dashboard -- <dashboard-checkout> [--check]",
  );
const check = process.argv.includes("--check");
const build = spawnSync("npm", ["run", "build:mcp-ui"], {
  cwd: resolve(dashboard),
  stdio: "inherit",
});
if (build.status !== 0) throw new Error("Dashboard picker build failed");
const source = await readFile(
  resolve(dashboard, "packages/mcp-contracts/src/index.ts"),
);
const hash = createHash("sha256").update(source).digest("hex");
const target = resolve("src/contracts/index.ts");
if (check) {
  const current = await readFile(target);
  if (!current.equals(source))
    throw new Error(
      "Shared API contracts are out of sync. Run sync:dashboard without --check.",
    );
} else {
  await mkdir(resolve("src/contracts"), { recursive: true });
  await writeFile(target, source);
}
const manifest = await syncPickerRelease(dashboard, { check });
if (manifest.contractsSha256 !== hash)
  throw new Error("Picker/API contracts do not match");
console.log(
  `Dashboard contracts and all ${Object.keys(manifest.pickers).length} MCP UI bundles are in sync (${hash.slice(0, 12)})`,
);
