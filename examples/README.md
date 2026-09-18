# CI → active variant → Fastlane

## GitHub Actions example

[Download or copy the screenshot workflow](github-actions/screenshots.yml). It renders saved designs on an Ubuntu runner and retains the validated package and retry receipt for seven days. App capture and store upload remain separate steps.

1. Copy `examples/release.mjs` and `examples/unpack-release.py` into the same paths in your app repository.
2. Copy `examples/release.json` to `release.json` at your repository root. Replace the example project UUID and select languages and device layouts already saved in AppLaunchFlow. Optionally set an existing `variantId`.
3. Run `npm install --save-exact applaunchflow@0.7.0` locally and commit `package.json` and `package-lock.json`. The workflow runs `npm ci` with Node 24.
4. Add a project-restricted API key with `exports:read` and `exports:write` as the GitHub Actions repository secret `APPLAUNCHFLOW_API_KEY`. An active API-eligible subscription and export allowance are required.
5. Copy `examples/github-actions/screenshots.yml` to `.github/workflows/screenshots.yml` and commit it to your default branch.
6. In GitHub, open **Actions → Screenshot release package → Run workflow**. Enter a stable release ID, for example `v2.4.0-screenshots-1`. Reuse it for retries of the same operation. Use a new ID after intentional design or export-parameter changes.
7. Download the `screenshots-<run-id>-<attempt>` artifact. Review the images before handing `output/fastlane/` to your store-upload job.

The job validates setup before rendering, uses read-only repository permissions, and passes the API key only to the setup check and render step. It retains any available ZIP, receipt, configuration and extracted output even after a failure. A polling timeout does not cancel the remote render; preserve the original release ID and receipt when investigating or retrying.

The concurrency group serializes this example within one repository. Give other workflows targeting the same project the same group; separate repositories need their own coordination. GitHub may replace an older pending run with a newer one, so this is not a durable release queue. Major-version action tags are used for readability; pin them to reviewed commit SHAs if required by your repository policy.

## Pro allowance and Automation

API and MCP exports require an active Pro subscription. Pro includes **5 export jobs per month**, shared across all API keys, projects and MCP clients. One job includes its requested languages and device formats. Annual Pro also receives a monthly allowance. Editor exports keep their existing limits.

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
