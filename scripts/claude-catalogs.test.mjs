import test from "node:test";
import assert from "node:assert/strict";
import { syncClaudeCatalogs } from "./claude-catalogs.mjs";

test("Claude feature catalogs match the registered hosted tool contracts", async () => {
  assert.ok((await syncClaudeCatalogs({ check: true })) > 0);
});
