import assert from "node:assert/strict";
import test from "node:test";
import { cursorWidgetResult } from "./widget-result.js";
import { needsWidgetFallback, withWidgetFallback } from "./request-context.js";

test("Cursor mirrors every known widget payload but never unrelated metadata", () => {
  for (const key of ["projectList", "assetList", "assetLibrary", "assetUpload", "picker", "socialGraphicsPicker", "promoVideoPicker"]) {
    const payload = { sample: key };
    const input = { content: [], structuredContent: { success: true }, _meta: { [key]: payload, privateOther: "secret" } };
    const output = cursorWidgetResult(input) as typeof input & { structuredContent: { widgetDataJson: string } };
    assert.deepEqual(JSON.parse(output.structuredContent.widgetDataJson), { [key]: payload });
    assert.equal(output._meta, input._meta);
    assert.equal(output.structuredContent.success, true);
  }
});
test("fallback is request-local and never rewrites errors or ordinary tool results", async () => {
  const error = { isError: true, _meta: { picker: {} } };
  assert.equal(cursorWidgetResult(error), error);
  const ordinary = { content: [] };
  assert.equal(cursorWidgetResult(ordinary), ordinary);
  assert.deepEqual(await Promise.all([true, false].map(enabled =>
    withWidgetFallback(enabled, async () => {
      await Promise.resolve();
      return needsWidgetFallback();
    }))), [true, false]);
  assert.equal(needsWidgetFallback(), false);
});
