import assert from "node:assert/strict";
import test from "node:test";
import { isVersionIncrease } from "./release-version.mjs";

test("publishes stable patch, minor, and major increases", () => {
  assert.equal(isVersionIncrease("0.3.0", "0.3.1"), true);
  assert.equal(isVersionIncrease("0.3.1", "0.4.0"), true);
  assert.equal(isVersionIncrease("0.4.0", "1.0.0"), true);
});

test("skips unchanged versions and downgrades", () => {
  assert.equal(isVersionIncrease("0.3.0", "0.3.0"), false);
  assert.equal(isVersionIncrease("0.3.0", "0.2.9"), false);
});

test("orders prereleases according to semantic version rules", () => {
  assert.equal(isVersionIncrease("1.0.0-beta.1", "1.0.0-beta.2"), true);
  assert.equal(isVersionIncrease("1.0.0-beta.2", "1.0.0"), true);
  assert.equal(isVersionIncrease("1.0.0", "1.0.1-beta.1"), true);
});
