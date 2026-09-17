# CI → active variant → Fastlane

## Pro allowance and Automation

API and MCP exports require an active Pro subscription. Pro includes **10 export jobs per month**, shared across all API keys, projects and MCP clients. One job includes its requested languages and device formats. Annual Pro also receives a monthly allowance. Editor exports keep their existing limits.

Add **Automation for €19/month on top of Pro** for unlimited API exports. Rate limits, job-size limits and AI generation credits still apply.

Use `await client.getApiUsage()` (requires `exports:read`) to check `used`, `remaining`, `unlimited` and `resetsAt`. The API returns HTTP 402 with code `api_export_quota_exhausted` when the monthly allowance is exhausted, and HTTP 403 with `api_pro_required` without Pro. Replaying the same idempotency key does not spend another export. Failed and canceled jobs restore their credit; an uncertain dispatch remains reserved until its outcome is known. Polling and downloads are included.

1. Create and save a design in the editor. CI edits this same variant directly.
2. Create a project-restricted key with `projects:read`, `assets:read`, `assets:write`, `designs:read`, `designs:write`, `exports:read`, `exports:write`. Store it as `APPLAUNCHFLOW_API_KEY` in the CI secret store.
3. Upload captures using `POST /api/v1/assets/upload/signed-url` and the returned upload instructions, or update existing capture paths through `/api/v1/assets/overwrite`. Read and save layouts using `/api/v1/translations`; copy and capture changes appear in the editor. The existing MCP asset and layout tools use these same endpoints.
4. Set `projectId`, saved language codes and format IDs in `release.json`. The render uses the active screenshot variant. Include the same existing `variantId` in layout edits and the render config to avoid an active-variant switch between calls. No version creation or binding maps are needed.
5. Install the matching released `applaunchflow` version with the `applaunchflow/api` export. This branch must be released after the dashboard v1 API; the previous npm version does not include it.
6. Set `APPLAUNCHFLOW_RELEASE_ID` to a stable release identity (repository + commit SHA + workflow name). Preserve it across retries. Run `node examples/release.mjs release.json release.zip` with Node 24. Preserve the receipt as a CI artifact even if polling times out. A retry with the same key returns the existing render; changed render parameters return 409. To export new edits, use a new release identity.
7. Run `python3 examples/unpack-release.py release.zip output`. The destination must not exist. The SDK checks ZIP SHA-256; extraction checks manifest, paths, sizes, CRCs and per-file SHA-256.
8. After reviewing the outputs, upload screenshots:

```sh
bundle exec fastlane deliver --screenshots_path output/fastlane/screenshots --skip_binary_upload true --skip_metadata true
bundle exec fastlane supply --metadata_path output/fastlane/metadata/android --skip_upload_apk true --skip_upload_aab true --skip_upload_metadata true --skip_upload_images true
```

## Editing localized copy and capture paths

```js
import { AppLaunchFlow } from "applaunchflow/api";
const client = new AppLaunchFlow({
  baseUrl: "https://dashboard.applaunchflow.com",
  token: process.env.APPLAUNCHFLOW_API_KEY,
});
// Resolve the existing active variant once if CI also writes before rendering.
const { variants } = await client.listVariants(projectId, "screenshots");
const variantId = variants.find((v) => v.is_active)?.id;
if (!variantId)
  throw new Error("Save a screenshot variant in the editor first");
const saved = await client.getLayout({
  generationId: projectId,
  variantId,
  language: "de",
});
// getLayout returns the saved translation's mobile_layout, tablet_layout, desktop_layout.
// Change the relevant screenshot paths and text leaves in these layout objects.
// Upload paths must belong to this project; preserve the layout's existing rich-text marks.
await client.requestJson("/api/v1/translations", {
  method: "POST",
  headers: { "Idempotency-Key": `${releaseId}:save-de` },
  body: {
    generationId: projectId,
    variantId,
    language: "de",
    mobileLayout: saved.mobile_layout,
    tabletLayout: saved.tablet_layout,
    desktopLayout: saved.desktop_layout,
  },
});
await client.createRender(
  { projectId, variantId, languages: ["de"], formats: ["ios.phone.6.5"] },
  `${releaseId}:render`,
);
```

Sequence writes before rendering. Each accepted export queues the saved layouts read for that request; assets remain in normal project storage and are not copied or frozen. Existing jobs are not updated by later layout edits. Do not overwrite asset bytes while an export is running.

The helper does not upload to stores or submit an app for review. Store credentials belong to Fastlane. An `indeterminate` dispatch needs investigation before creating another paid render; a polling timeout is not cancellation.

Package validation checks structure, store dimensions, image integrity, opaque pixels, file limits and checksums. Review translation quality and clipping before store upload.
