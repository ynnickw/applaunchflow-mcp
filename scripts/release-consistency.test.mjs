import assert from "node:assert/strict";
import test from "node:test";
import {
  isDeployablePath,
  validateReleaseState,
} from "./release-consistency.mjs";

const alignedRelease = {
  packageVersion: "0.3.10",
  lockVersion: "0.3.10",
  lockRootVersion: "0.3.10",
  serverVersion: "0.3.10",
  pluginVersion: "0.3.10",
  previousVersion: "0.3.9",
};

test("classifies production inputs separately from workflow and documentation files", () => {
  assert.equal(isDeployablePath("src/http.ts"), true);
  assert.equal(isDeployablePath("Dockerfile"), true);
  assert.equal(isDeployablePath("server.json"), true);
  assert.equal(isDeployablePath(".claude-plugin/plugin.json"), true);
  assert.equal(isDeployablePath(".github/workflows/ci.yml"), false);
  assert.equal(isDeployablePath("README.md"), false);
});

test("accepts aligned releases with a version increase", () => {
  assert.deepEqual(
    validateReleaseState({
      ...alignedRelease,
      changedPaths: ["src/http.ts", "package.json", "server.json"],
    }),
    {
      deployableChanges: ["src/http.ts", "package.json", "server.json"],
      version: "0.3.10",
    },
  );
});

test("rejects mismatched release versions", () => {
  assert.throws(
    () =>
      validateReleaseState({
        ...alignedRelease,
        serverVersion: "0.3.9",
        changedPaths: ["server.json"],
      }),
    /Release versions must match/,
  );
});

test("rejects deployable changes without a version increase", () => {
  assert.throws(
    () =>
      validateReleaseState({
        ...alignedRelease,
        packageVersion: "0.3.9",
        lockVersion: "0.3.9",
        lockRootVersion: "0.3.9",
        serverVersion: "0.3.9",
        pluginVersion: "0.3.9",
        changedPaths: ["src/http.ts"],
      }),
    /Deployable changes require a version increase/,
  );
});

test("allows workflow-only changes without a version increase", () => {
  const result = validateReleaseState({
    ...alignedRelease,
    packageVersion: "0.3.9",
    lockVersion: "0.3.9",
    lockRootVersion: "0.3.9",
    serverVersion: "0.3.9",
    pluginVersion: "0.3.9",
    changedPaths: [".github/workflows/ci.yml"],
  });
  assert.deepEqual(result.deployableChanges, []);
});
