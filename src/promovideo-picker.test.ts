import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPromoVideoCandidateRequest,
  buildPromoVideoDashboardUrl,
} from "./tools/promovideo.js";

test("generate_promo_video requests three transient candidates", () => {
  assert.deepEqual(
    buildPromoVideoCandidateRequest({ projectId: "project", message: "fresh" }),
    { projectId: "project", message: "fresh", candidateCount: 3 },
  );
});

test("the MCP opens the dashboard candidate picker instead of a saved variant", () => {
  const url = new URL(
    buildPromoVideoDashboardUrl(
      {
        credentials: { baseUrl: "https://dashboard.applaunchflow.com" },
      } as never,
      {
        generationId: "11111111-1111-4111-8111-111111111111",
        candidateKey: "candidate-key",
        replaceVariantId: "22222222-2222-4222-8222-222222222222",
      },
    ),
  );

  assert.equal(url.pathname, "/promo-video-picker");
  assert.equal(url.searchParams.get("candidateKey"), "candidate-key");
  assert.equal(
    url.searchParams.get("replaceVariantId"),
    "22222222-2222-4222-8222-222222222222",
  );
});
