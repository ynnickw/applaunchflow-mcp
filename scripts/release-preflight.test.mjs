import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  locateDashboard,
  referenceSha256,
  verifyReleaseLock,
} from "./release-preflight.mjs";

const hash = referenceSha256("reference");

test("a version increase requires a lock for this version and reference", () => {
  const base = { previousVersion: "0.7.14", packageVersion: "0.7.15" };
  assert.match(
    verifyReleaseLock({
      ...base,
      lock: { version: "0.7.15", referenceSha256: hash, dashboardCommit: "abc" },
      referenceHash: hash,
    }),
    /verified against dashboard abc/,
  );
  assert.throws(
    () => verifyReleaseLock({ ...base, lock: null, referenceHash: hash }),
    /has no editor-reference.lock.json/,
  );
  assert.throws(
    () =>
      verifyReleaseLock({
        ...base,
        lock: { version: "0.7.14", referenceSha256: hash },
        referenceHash: hash,
      }),
    /written for 0.7.14/,
  );
  assert.throws(
    () =>
      verifyReleaseLock({
        ...base,
        lock: { version: "0.7.15", referenceSha256: hash },
        referenceHash: referenceSha256("edited later"),
      }),
    /changed after the preflight/,
  );
});

test("unreleased changes do not need a lock", () => {
  assert.match(
    verifyReleaseLock({
      previousVersion: "0.7.14",
      packageVersion: "0.7.14",
      lock: null,
      referenceHash: hash,
    }),
    /not required/,
  );
});

test("dashboard lookup prefers the explicit path, then sibling checkouts", () => {
  const root = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    const mcp = join(root, "worktrees", "mcp");
    mkdirSync(mcp, { recursive: true });
    assert.equal(locateDashboard(mcp, {}), null);
    const dashboard = join(root, "applaunchflow");
    mkdirSync(join(dashboard, "src/types"), { recursive: true });
    writeFileSync(join(dashboard, "package.json"), "{}");
    writeFileSync(join(dashboard, "src/types/layout.ts"), "");
    assert.equal(locateDashboard(mcp, {}), dashboard);
    assert.equal(
      locateDashboard(mcp, { APPLAUNCHFLOW_DASHBOARD_PATH: dashboard }),
      dashboard,
    );
    assert.throws(() =>
      locateDashboard(mcp, { APPLAUNCHFLOW_DASHBOARD_PATH: join(root, "nope") }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
