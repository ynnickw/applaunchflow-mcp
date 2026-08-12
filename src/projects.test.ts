import assert from "node:assert/strict";
import test from "node:test";
import { toProjectSummary, toSafeProjectState } from "./tools/projects.js";

const rawProject = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "private-user-id",
  name: "LaunchNotes Demo",
  platform: "ios",
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-12T10:00:00.000Z",
  metadata: {
    appName: "LaunchNotes Demo",
    category: "Productivity",
    defaultDeviceType: "phone",
    detectedLanguage: "en",
    logoPath: "private/logo.png",
    logoUrl: "https://storage.example/private-logo?token=secret",
    screenshotCache: { firstMobilePath: "private/screenshot.png" },
  },
  aso_copy: { keywords: "private keyword payload" },
};

test("project summaries contain only workflow-relevant public fields", () => {
  assert.deepEqual(toProjectSummary(rawProject), {
    id: rawProject.id,
    name: "LaunchNotes Demo",
    platform: "ios",
    updatedAt: "2026-08-12T10:00:00.000Z",
    category: "Productivity",
    defaultDeviceType: "phone",
    detectedLanguage: "en",
  });
});

test("safe project state removes internal records and signed asset URLs", () => {
  const state = toSafeProjectState({
    project: { ...rawProject, logoUrl: "https://storage.example/logo?token=secret" },
    assets: {
      mobileScreenshots: ["https://storage.example/one?token=secret"],
      tabletScreenshots: [],
      desktopScreenshots: ["https://storage.example/two?token=secret"],
      logo: "https://storage.example/logo?token=secret",
      qrCodes: [{ signedUrl: "https://storage.example/qr?token=secret" }],
    },
    content: {
      screenshots: {
        type: "screenshots",
        variants: [
          {
            id: "variant-id",
            generation_id: "generation-id",
            content_type: "screenshots",
            label: "v1",
            is_active: true,
            created_at: "2026-08-01T10:00:00.000Z",
            updated_at: "2026-08-12T10:00:00.000Z",
            languages: ["en"],
            ready: true,
            config: { internal: true },
          },
        ],
        activeVariant: {
          id: "variant-id",
          generation_id: "generation-id",
          is_active: true,
          ready: true,
        },
        editUrl: "https://dashboard.applaunchflow.com/editor?id=safe",
        variantCount: 1,
        isReady: true,
        translations: [{ raw: "private layout" }],
      },
      asoCopy: { asoCopy: { keywords: "private" } },
      appIcon: { variants: [{ config: "private" }] },
    },
    progress: {
      totalItems: 4,
      completedItems: 1,
      percentage: 25,
      missingItems: ["promoVideo"],
    },
    readyItems: { "internal-generation-id": true },
  });

  assert.deepEqual(state.assets, {
    screenshotCounts: { mobile: 1, tablet: 0, desktop: 1 },
    hasLogo: true,
    qrCodeCount: 1,
  });
  assert.deepEqual(Object.keys(state.content as object), ["screenshots"]);

  const serialized = JSON.stringify(state);
  for (const forbidden of [
    "private-user-id",
    "token=secret",
    "logoPath",
    "screenshotCache",
    "aso_copy",
    "translations",
    "readyItems",
    "created_at",
    "content_type",
    "config",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
