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

test("prepared picker subsets cannot expose internal ids or silently broaden an empty match", () => {
  const catalog = { studio: {}, default: {}, __internal: {} };
  assert.deepEqual(listPublicTemplateIds(catalog, ["studio", "missing"]), [
    "studio",
  ]);
  assert.deepEqual(listPublicTemplateIds(catalog, []), ["default", "studio"]);
  assert.throws(
    () => listPublicTemplateIds(catalog, ["missing", "__internal"]),
    /None of the requested/,
  );
});
