import assert from "node:assert/strict";
import test from "node:test";
import { listPublicTemplateIds } from "./catalog.js";

test("listPublicTemplateIds returns sorted public templates", () => {
  assert.deepEqual(
    listPublicTemplateIds({
      beauty: {},
      __layoutVersion: "v1",
      action: {},
    }),
    ["action", "beauty"],
  );
});

test("listPublicTemplateIds handles an absent catalog", () => {
  assert.deepEqual(listPublicTemplateIds(undefined), []);
});
