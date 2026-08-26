import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { isVersionIncrease } from "./release-version.mjs";

const DEPLOYABLE_PATHS = [
  /^\.claude-plugin\/plugin\.json$/,
  /^src\//,
  /^Dockerfile$/,
  /^package(?:-lock)?\.json$/,
  /^railway\.json$/,
  /^server\.json$/,
  /^tsconfig\.json$/,
];

export function isDeployablePath(path) {
  return DEPLOYABLE_PATHS.some((pattern) => pattern.test(path));
}

export function validateReleaseState({
  packageVersion,
  lockVersion,
  lockRootVersion,
  serverVersion,
  pluginVersion,
  previousVersion,
  changedPaths,
}) {
  const versions = new Set([
    packageVersion,
    lockVersion,
    lockRootVersion,
    serverVersion,
    pluginVersion,
  ]);
  if (versions.size !== 1) {
    throw new Error(
      `Release versions must match: package=${packageVersion}, lock=${lockVersion}, lock-root=${lockRootVersion}, server=${serverVersion}, plugin=${pluginVersion}`,
    );
  }

  const deployableChanges = changedPaths.filter(isDeployablePath);
  if (
    deployableChanges.length > 0 &&
    !isVersionIncrease(previousVersion, packageVersion)
  ) {
    throw new Error(
      `Deployable changes require a version increase from ${previousVersion}; current version is ${packageVersion}. Changed: ${deployableChanges.join(", ")}`,
    );
  }

  return { deployableChanges, version: packageVersion };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const baseIndex = process.argv.indexOf("--base");
  const headIndex = process.argv.indexOf("--head");
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : undefined;
  const head = headIndex >= 0 ? process.argv[headIndex + 1] : "HEAD";
  if (!base || !head || /^0+$/.test(base)) {
    console.error(
      "Usage: node scripts/release-consistency.mjs --base <git-sha> [--head <git-sha>]",
    );
    process.exit(2);
  }

  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const serverJson = readJson("server.json");
  const pluginJson = readJson(".claude-plugin/plugin.json");
  const previousPackage = JSON.parse(git("show", `${base}:package.json`));
  const changedPaths = git("diff", "--name-only", base, head)
    .split("\n")
    .filter(Boolean);

  try {
    const result = validateReleaseState({
      packageVersion: packageJson.version,
      lockVersion: packageLock.version,
      lockRootVersion: packageLock.packages?.[""]?.version,
      serverVersion: serverJson.version,
      pluginVersion: pluginJson.version,
      previousVersion: previousPackage.version,
      changedPaths,
    });
    console.log(
      `Release consistency passed for ${result.version}; ${result.deployableChanges.length} deployable file(s) changed.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
