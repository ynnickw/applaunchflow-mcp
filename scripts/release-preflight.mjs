import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isVersionIncrease } from "./release-version.mjs";

// Release gate for the checked-in editor reference.
//
// Local (before bumping/merging a release, needs a dashboard checkout):
//   npm run release:preflight
// verifies src/resources/editor-contracts.generated.json against the dashboard
// (sync-editor-reference --check) and records the result in
// editor-reference.lock.json for this package version.
//
// CI (no dashboard checkout):
//   node scripts/release-preflight.mjs --verify --base <git-sha>
// refuses a version increase unless the lock file was written for exactly this
// version and this reference content.

const root = fileURLToPath(new URL("../", import.meta.url));
export const REFERENCE_PATH = "src/resources/editor-contracts.generated.json";
export const LOCK_PATH = "editor-reference.lock.json";

export function referenceSha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function dashboardCandidates(mcpRoot, env = process.env) {
  return [
    env.APPLAUNCHFLOW_DASHBOARD_PATH &&
      resolve(env.APPLAUNCHFLOW_DASHBOARD_PATH),
    resolve(mcpRoot, "../applaunchflow"),
    resolve(mcpRoot, "../../applaunchflow"),
  ].filter(Boolean);
}

export function locateDashboard(mcpRoot, env = process.env) {
  const isDashboard = (path) =>
    existsSync(resolve(path, "src/types/layout.ts")) &&
    existsSync(resolve(path, "package.json"));
  if (
    env.APPLAUNCHFLOW_DASHBOARD_PATH &&
    !isDashboard(env.APPLAUNCHFLOW_DASHBOARD_PATH)
  )
    throw new Error(
      `APPLAUNCHFLOW_DASHBOARD_PATH=${env.APPLAUNCHFLOW_DASHBOARD_PATH} is not a dashboard checkout.`,
    );
  return dashboardCandidates(mcpRoot, env).find(isDashboard) ?? null;
}

/** Throws unless a version increase carries a lock for this exact reference. */
export function verifyReleaseLock({
  previousVersion,
  packageVersion,
  lock,
  referenceHash,
}) {
  if (!isVersionIncrease(previousVersion, packageVersion))
    return "No version increase; editor reference lock not required.";
  const fix =
    "Run `npm run release:preflight` with the release dashboard checkout (APPLAUNCHFLOW_DASHBOARD_PATH) and commit editor-reference.lock.json.";
  if (!lock)
    throw new Error(`Release ${packageVersion} has no ${LOCK_PATH}. ${fix}`);
  if (lock.version !== packageVersion)
    throw new Error(
      `${LOCK_PATH} was written for ${lock.version}, not ${packageVersion}. ${fix}`,
    );
  if (lock.referenceSha256 !== referenceHash)
    throw new Error(
      `The editor reference changed after the preflight check for ${packageVersion}. ${fix}`,
    );
  return `Editor reference verified against dashboard ${lock.dashboardCommit ?? "(unknown commit)"} for ${packageVersion}.`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function preflight() {
  const dashboard = locateDashboard(root);
  if (!dashboard)
    throw new Error(
      "No dashboard checkout found. Set APPLAUNCHFLOW_DASHBOARD_PATH to the dashboard commit being released.",
    );
  const check = spawnSync(
    process.execPath,
    [resolve(root, "scripts/sync-editor-reference.mjs"), "--check"],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, APPLAUNCHFLOW_DASHBOARD_PATH: dashboard },
    },
  );
  if (check.status !== 0)
    throw new Error(
      `Refusing to release: the editor reference is stale for ${dashboard}. Run APPLAUNCHFLOW_DASHBOARD_PATH=${dashboard} npm run sync:editor-reference, review, then rerun this preflight.`,
    );
  let dashboardCommit;
  try {
    dashboardCommit = execFileSync("git", ["-C", dashboard, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    dashboardCommit = undefined;
  }
  const lock = {
    version: readJson(resolve(root, "package.json")).version,
    referenceSha256: referenceSha256(
      readFileSync(resolve(root, REFERENCE_PATH)),
    ),
    ...(dashboardCommit ? { dashboardCommit } : {}),
  };
  writeFileSync(resolve(root, LOCK_PATH), JSON.stringify(lock, null, 2) + "\n");
  console.log(
    `Editor reference matches dashboard ${dashboardCommit ?? dashboard}; wrote ${LOCK_PATH} for ${lock.version}.`,
  );
}

function verify(base) {
  if (!base || /^0+$/.test(base)) {
    console.error(
      "Usage: node scripts/release-preflight.mjs --verify --base <git-sha>",
    );
    process.exit(2);
  }
  const previousVersion = JSON.parse(
    execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" }),
  ).version;
  const lockFile = resolve(root, LOCK_PATH);
  console.log(
    verifyReleaseLock({
      previousVersion,
      packageVersion: readJson(resolve(root, "package.json")).version,
      lock: existsSync(lockFile) ? readJson(lockFile) : null,
      referenceHash: referenceSha256(
        readFileSync(resolve(root, REFERENCE_PATH)),
      ),
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    if (process.argv.includes("--verify")) {
      const index = process.argv.indexOf("--base");
      verify(index >= 0 ? process.argv[index + 1] : undefined);
    } else {
      preflight();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
