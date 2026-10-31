import test from "node:test";
import assert from "node:assert/strict";
import { documentedSchema, syncClaudeCatalogs } from "./claude-catalogs.mjs";

test("Claude feature catalogs match the registered hosted tool contracts", async () => {
  assert.ok((await syncClaudeCatalogs({ check: true })) > 0);
});

test("Claude prose normalization never rewrites API keys or enum values", () => {
  assert.deepEqual(
    documentedSchema({
      properties: {
        pass: { description: "Pass this value", enum: ["pass", "fail"] },
      },
    }),
    {
      properties: {
        pass: { description: "Provide this value", enum: ["pass", "fail"] },
      },
    },
  );
});
