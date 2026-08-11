import { pathToFileURL } from "node:url";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parseVersion(version) {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) throw new Error(`Invalid semantic version: ${version}`);
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0) {
    return Number(left.length === 0) - Number(right.length === 0);
  }

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    if (left[index] === right[index]) continue;

    const leftNumeric = /^\d+$/.test(left[index]);
    const rightNumeric = /^\d+$/.test(right[index]);
    if (leftNumeric && rightNumeric) {
      return Number(left[index]) > Number(right[index]) ? 1 : -1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

export function compareVersions(leftVersion, rightVersion) {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  for (let index = 0; index < 3; index += 1) {
    if (left.core[index] !== right.core[index]) {
      return left.core[index] > right.core[index] ? 1 : -1;
    }
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export function isVersionIncrease(previousVersion, currentVersion) {
  return compareVersions(currentVersion, previousVersion) > 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [previousVersion, currentVersion] = process.argv.slice(2);
  if (!previousVersion || !currentVersion) {
    console.error("Usage: node scripts/release-version.mjs <previous> <current>");
    process.exit(2);
  }

  const increased = isVersionIncrease(previousVersion, currentVersion);
  console.log(`${previousVersion} -> ${currentVersion}: ${increased ? "publish" : "skip"}`);
  process.exit(increased ? 0 : 1);
}
