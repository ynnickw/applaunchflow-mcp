# AppLaunchFlow MCP

## Pro allowance and Automation

API and MCP exports require an active Pro subscription. Pro includes **5 export jobs per month**, shared across all API keys, projects and MCP clients. One job includes its requested languages and device formats. Annual Pro also receives a monthly allowance. Editor exports keep their existing limits.

Add **Automation for €19/month on top of Pro** for unlimited API exports. Rate limits, job-size limits and AI generation credits still apply.

Use `await client.getApiUsage()` (requires `exports:read`) to check `used`, `remaining`, `unlimited` and `resetsAt`. The API returns HTTP 402 with code `api_export_quota_exhausted` when the monthly allowance is exhausted, and HTTP 403 with `api_pro_required` without Pro. Replaying the same idempotency key does not spend another export. Failed and canceled jobs restore their credit; an uncertain dispatch remains reserved until its outcome is known. Polling and downloads are included.

MCP server for AppLaunchFlow — create App Store & Google Play screenshots with AI.

## Official API and CI releases

The MCP and the Node SDK now share the versioned `/api/v1` API. Import `AppLaunchFlow` from `applaunchflow/api` for project-scoped API key authentication, active-variant editing, asynchronous renders and checksum-verified downloads. Browser OAuth remains the normal way to connect MCP.

Use the [CI and Fastlane example](examples/README.md). Update captures and localized copy directly in the active variant, then render with `projectId`, `languages` and `formats`. CI keys need asset, design read/write and export scopes. [HTTP API reference](https://dashboard.applaunchflow.com/docs/api).

**Release ordering:** 0.7.0 requires the dashboard v1 API and validating bundler to be enabled before this MCP/SDK release is published or deployed.

**Release ordering:** 0.8.0 requires dashboard PR #282 (new v1 routes for previews, exports, translation and validation) and the Remotion site redeployed from that commit before this release is published or deployed.

**Release ordering:** 0.8.4 requires the dashboard widget decoder supporting private
`payloadJson` catalogs. Deploy that backwards-compatible decoder before the MCP:
screenshot/social layouts are now transported as opaque JSON, matching the promo
picker, while model-visible summaries remain unchanged. Widget metadata fingerprints
also invalidate cached resources when the trusted store-icon CSP changes.

**Release ordering:** 0.8.5 moves screenshot/social picker display to the existing
read-only browse tools. Deploy dashboard support for discovery results before the
MCP. Preparation still supports progress for long requests, but no longer owns a
widget; browsing reads the prepared catalog without generation or mutation.

## Connect

### Cursor marketplace plugin

This public repository includes a Cursor plugin manifest in `.cursor-plugin/plugin.json`
and a root `mcp.json` targeting the hosted service. No API keys or local server are required.
After installing, authorize AppLaunchFlow through Cursor's MCP settings using your
AppLaunchFlow account. Existing plan limits apply; installing the plugin does not
grant a paid AppLaunchFlow subscription.

Try "List my AppLaunchFlow projects", then "Show the screenshot styles for this
project using its existing screenshots". Choose the style in the interactive picker;
preparing previews does not select a design for you. The same flow supports social
graphics and promo videos. Asset uploads and management are available from the asset browser.

If you already configured AppLaunchFlow manually, disable the duplicate MCP entry
when installing the plugin. Support: support@applaunchflow.com.

Maintainers: validate with `npm test`, then submit the public repository at
https://cursor.com/marketplace/publish. Cursor reviews marketplace listings separately
from npm and the MCP Registry. The Cursor plugin version tracks its packaging release;
the remotely hosted server can receive independent updates.

AppLaunchFlow is a hosted MCP connector with OAuth 2.1 and PKCE. No API key,
local token, or scoped npm package name is required.

### Codex

The shortest setup command configures the hosted connector and opens OAuth:

```bash
npx -y applaunchflow connect codex
```

Useful follow-up commands:

```bash
npx -y applaunchflow status
npx -y applaunchflow disconnect
```

The equivalent native Codex commands are:

```bash
codex mcp add applaunchflow --url https://mcp.applaunchflow.com/mcp
codex mcp login applaunchflow
codex mcp get applaunchflow
codex mcp remove applaunchflow
```

### Claude Code

The same one-command setup is available for Claude Code. It replaces a legacy
AppLaunchFlow entry when necessary, adds the hosted HTTP connector, and opens
OAuth sign-in:

```bash
npx -y applaunchflow connect claude
```

The equivalent native Claude Code commands are:

```bash
claude mcp add --transport http applaunchflow https://mcp.applaunchflow.com/mcp
claude mcp login applaunchflow
```

### ChatGPT

```bash
npx -y applaunchflow connect chatgpt
```

Paste the displayed URL when creating a custom MCP connector in ChatGPT. The
same URL is also available at any time with `npx -y applaunchflow url`.

### Other MCP clients

Use this Streamable HTTP endpoint and enable OAuth when prompted:

```text
https://mcp.applaunchflow.com/mcp
```

### Claude Code plugin

This repository is also a distributable Claude Code plugin. Its
`.claude-plugin/plugin.json` manifest bundles the hosted OAuth connector from
`.mcp.json`, so users do not need to copy a server configuration manually.

To validate or try the plugin directly from a clone:

```bash
claude plugin validate . --strict
claude --plugin-dir .
```

Claude Code starts the hosted connector when the plugin is enabled and opens
the AppLaunchFlow OAuth flow when authentication is required.

## Hosted service

### Editor knowledge and configuration reference

The MCP connector does not train or replace the user's model. It supplies
server instructions, read/edit tools and an on-demand configuration reference.
Before any edit, the instructions direct the assistant to
`get_editing_reference(feature)`, then to retrieve the relevant named symbols.
This also works in clients that do not expose MCP resource browsing.

Supported features are `screenshots`, `socialGraphics`, `promoVideo`, and
`mockups`. The index includes the full persisted types, API/renderer validators,
device/format/music/motion catalogs, units, bounds, defaults, and read-before-save
workflows. Examples: `ScreenshotNode` for overflow/crop/status bars,
`Model3DConfig` for laptop lids, `MultiPhoneContentSchema` for promo slot arrays,
and `mockupDeviceSchema` for independent device entrances/exits. Complete
references are also available at `applaunchflow://editing/<feature>`; the existing
layout and video-config resource URLs resolve to these current references.

The checked-in reference is generated from an explicit allowlist of dashboard
contracts. It contains no project data or secrets and has no runtime dependency
on a dashboard checkout. To refresh and verify it against the dashboard release:

```bash
APPLAUNCHFLOW_DASHBOARD_PATH=../applaunchflow npm run sync:editor-reference
APPLAUNCHFLOW_DASHBOARD_PATH=../applaunchflow npm run check:editor-reference
npm test
```

Run the drift check whenever editor contracts change and before publishing the
connector alongside a dashboard release. Passing MCP tests alone does not prove
the deployed dashboard matches the snapshot. UI-only actions (selection, undo,
browser rendering, recording camera input) are not persisted configuration and
must not be advertised as MCP tools. Models can still make mistakes: preserve
unrelated fields, read back after saving and verify visual composition where a
preview is available.

### Inline screenshot picker

`prepare_screenshot_styles` prepares a catalog, then `browse_templates` displays
its cached V1/V2 picker in MCP Apps-compatible hosts. The agent completes both
steps before waiting for the user's choice. Reopen with the same catalogKey;
no generation or saved variant is needed to browse. Social graphics uses
`prepare_social_graphics_styles` then `browse_social_templates`. There are no
additional render tools. Promo videos keep their existing asynchronous picker.
Variants are created only after explicit selection through the authenticated
tool bridge; all hosts retain the full-gallery link.
See [local testing and deployment notes](docs/inline-picker.md).

The public Streamable HTTP service uses OAuth 2.1 authorization code flow with
PKCE through the AppLaunchFlow dashboard.

```bash
npm ci
npm run build
APPLAUNCHFLOW_BASE_URL=https://dashboard.applaunchflow.com \
APPLAUNCHFLOW_MCP_PUBLIC_URL=https://mcp.applaunchflow.com \
PORT=8787 \
npm run start:http
```

Public endpoints:

- MCP: `https://mcp.applaunchflow.com/mcp`
- Protected resource metadata: `https://mcp.applaunchflow.com/.well-known/oauth-protected-resource`
- Health: `https://mcp.applaunchflow.com/healthz`

## Official MCP Registry

AppLaunchFlow is published as `io.github.ynnickw/applaunchflow` in the official
MCP Registry. The checked-in [`server.json`](server.json) is the canonical
registry manifest and points clients to the hosted OAuth connector.

Registry publication runs automatically from GitHub Actions when the manifest
changes on `main`. Keep the manifest version aligned with `package.json`; the
test suite enforces this before publication.

`APPLAUNCHFLOW_MCP_PUBLIC_URL` may be either the origin or the full `/mcp`
URL; both services normalize it to the same canonical resource URL. Set
`APPLAUNCHFLOW_MCP_PUBLIC_URL=https://mcp.applaunchflow.com/mcp` and
`NEXT_PUBLIC_APP_URL=https://dashboard.applaunchflow.com` on the dashboard.

The included `Dockerfile` produces a non-root OCI image for the hosted server.
The MCP host and dashboard must both be served through public HTTPS in
production. Do not expose the Node process directly without a TLS-terminating
platform or reverse proxy.

## Personalized style workflow

Screenshot and social-graphics styles are prepared once for the selected app screenshots, then the chosen style is applied from cache. This lets users compare styles without paying for another AI call when they choose one.

For App Store screenshots:

1. `list_source_screenshots`
2. `prepare_screenshot_styles` with 3-7 ordered paths
3. `browse_templates` with the returned generationId/catalogKey and requested deviceType displays the cached picker. Compare V1/V2, then confirm the choice; the picker creates the new variant and opens the editor.

`browse_templates` can reopen a prepared catalog, and `apply_screenshot_style`
remains available when an API client supplies a template id directly.

For social graphics:

1. `list_source_screenshots`
2. `prepare_social_graphics_styles` with 3-7 ordered paths
3. `browse_social_templates` with the returned generationId/catalogKey and primaryFormat as format displays the cached picker. The user chooses a template and palette there;
   the choice creates a variant with every format and opens the graphics editor.

`browse_social_templates` also reopens a prepared catalog, and
`apply_social_graphics_style` is for an API client or user that supplies a
template id directly. Agents do not call it after preparing styles.

The screenshot result includes phone, tablet, and desktop. The social result includes every supported social, store-listing, and mobile-ad format. New screenshot and social-graphics variants always go through their visual pickers so the user explicitly chooses the template and palette.

## Scope, plans and limits

`get_capabilities` lists, per area, the tools this server exposes and the
editor URL, plus everything that only the dashboard can do (store publishing,
store connections, custom product pages, A/B tests, reviews, app icon, website design
and publishing, export history, collaborators, QR codes, API keys, billing) with a deep link for
each. Pass `projectId` for project links. `get_plan_usage` reports the monthly
API export allowance and, with `projectId`, keyword and competitor limits.

Plan and quota rejections (`VARIANT_LIMIT_REACHED`, `PROJECT_LIMIT_REACHED`,
`keyword_limit`, `competitor_limit`, translation gating, `api_export_quota_exhausted`,
`api_pro_required`) return `error.recovery` with `retryable: false`, guidance
and an `upgradeUrl`. Only HTTP 429 is marked retryable.

Other tools in this area:

- Store listing text: `get_store_listing`, `generate_store_listing`,
  `update_store_listing` (merges only the fields passed, enforces store
  character limits), `translate_store_listing`.
- Keywords: `add_keywords` resolves the store and app from the project's linked
  app; `remove_keywords`, `suggest_keywords`, `add_keyword_competitors`,
  `remove_keyword_competitors`, `suggest_keyword_competitors`.
- Variants: `create_variant` makes an empty variant and never activates it;
  `duplicate_variant` copies content and returns an editor URL;
  `set_active_variant` refuses empty variants; `delete_variant` needs
  `confirm: true`.
- `create_project` accepts `appStore` (Apple id or apps.apple.com URL) to import
  name, category, description and icon and link the app.
- Tools that take `generationId` also accept `projectId`; both are the project id.

## Releasing

1. Resync the editor reference against the dashboard commit being released and
   review the diff:
   `APPLAUNCHFLOW_DASHBOARD_PATH=../applaunchflow npm run sync:editor-reference`
2. Bump the version in every manifest (see `scripts/release-consistency.mjs`).
3. `APPLAUNCHFLOW_DASHBOARD_PATH=../applaunchflow npm run release:preflight`
   checks the reference against that dashboard and writes
   `editor-reference.lock.json` for the new version. It refuses when the
   reference is stale.
4. `npm test`, commit (including the lock file) and merge.

CI and the npm publish workflow run `release-preflight.mjs --verify`, which
refuses a version increase without a lock written for exactly that version and
reference content. The dashboard repo runs the opposite check
(`npm run check:mcp-editor-reference` there), so a dashboard contract change is
flagged before the MCP is resynced.

## Development

```bash
npm ci
npm run dev
```

Run `npm test` before publishing or deploying. See
[`docs/openai-submission.md`](docs/openai-submission.md) for the final OpenAI
submission checklist and manual test cases.

# Embedded project and asset lists

`list_projects` shows a compact list with app icons, explicit project selection,
and dashboard links. `list_assets` shows uploaded screenshots, illustrations,
icons, recordings, backgrounds, fonts, and music/clips using the same browser
component as the dashboard Hub. The Upload button accepts up to 10 files per
batch (25 MB per file), with progress and a refreshed list after completion.
Screenshots use the selected device/platform folder; other uploads use the
selected asset tab. Uploading stores files only: it does not replace the app
icon, apply a design, register a font family, or overwrite existing assets.
Asset deletion remains an explicitly confirmed action in the Hub.

The app-only `prepare_asset_upload` tool uses the connected account to authorize
one uniquely named storage object. Its signed URL is returned in widget
metadata (with the Cursor compatibility fallback described below). The browser sends the file bytes directly to storage; neither file
contents nor account credentials pass through the model. Refreshing calls the
read-only `list_assets` tool. No upload is triggered by merely opening the list.

Project selection uses standard MCP Apps messaging, or ChatGPT's native
`sendFollowUpMessage` bridge when the host does not advertise text messaging.
Hosts with neither retain the exact copy/paste fallback. A failed/ambiguous send
is never automatically retried through another bridge.

Cursor currently drops tool-result `_meta` before delivering results to embedded
apps. For HTTP requests with a `Cursor/` user agent, the connector mirrors only
the seven known widget payloads into `structuredContent.widgetDataJson`.
All five widgets prefer `_meta` and accept this structured fallback, including
asset-folder and upload responses. Structured content can be model-visible;
never add arbitrary metadata or account credentials to this allowlist. ChatGPT
and Claude keep their original metadata-only delivery. Test the stripped-metadata
path with the dashboard harness `?picker=projects&scenario=cursor` (also supports
`assets`, `screenshots`, `social`, and `promo`).

For maintainers, regenerate the packaged list views and shared contracts with
`npm run sync:dashboard -- /absolute/path/to/dashboard`. Add `--check` to verify
they match without updating the connector artifacts. `npm test` checks artifact
integrity and contract hashes without requiring another checkout or network.
Existing screenshot, social and promo picker behavior is unchanged.

Widget resource URIs include a fingerprint of their sandbox/CSP metadata as well
as the bundle or UI version. A metadata-only fix therefore gets a new cache key,
including in hosts that cache resource documents for an entire conversation.
Generic MCP Apps metadata leaves sandbox identity to the host; the dedicated
OpenAI domain is declared only through `openai/widgetDomain`. Known, well-formed
older widget version/digest URIs still resolve to the current public UI payload,
without changing account authorization or expanding CSP origins.


### Hosted MCP runtime metrics

Set both `APPLAUNCHFLOW_MCP_POSTHOG_KEY` (the PostHog project token, not a personal
API key) and `APPLAUNCHFLOW_MCP_POSTHOG_HOST` (for example,
`https://eu.i.posthog.com`) for the required hosted `$mcp_tool_call` events.
Use the ingestion host for the same project that receives dashboard/landing events.
The hosted server refuses to start if either variable is missing or the host is invalid.
Local stdio calls are excluded because they have no verified hosted account identity.

Events use the account ID returned by authenticated token introspection and contain
only the tool name, client family, duration, outcome and fixed error category.
Arguments, outputs, asset URLs, prompts, bearer tokens and project contents are
excluded. Capture runs in the background, is bounded, and never retries a tool or
changes its result when analytics is unavailable. Existing Railway logs remain.
No session or agent-intent grouping is inferred from stateless requests.

Long-running style generation sends progress when the MCP request supplies a
progress token. Clients must request progress and reset their timeout on it;
a fixed client deadline can still end the call. After an uncertain generation,
inspect project/catalog state before retrying. For rendering, reuse the original
idempotency key and poll `get_release_render` until the job reaches a terminal
status; acceptance alone does not prove the package succeeded.

### Interrupted screenshot uploads

`upload_screenshots` reports each completed file with zero-based `sourceIndex`
and `fileIndex`, its original `sourceFilename`, stored `path`, and
`folderAssigned`. Folder assignment runs after uploads in chunks of up to 50
paths, rather than consuming one mutation per file.

An incomplete batch includes `recovery.phase`, the failed source/file indices,
and `recovery.nextStep`. Retry only the failed and remaining sources. If only
folder assignment failed, use `move_assets` on unassigned paths without
uploading again. A `pendingUpload` or `pendingOverwrite` means a write's outcome
needs checking before retrying. No signed upload URLs or source URLs are
returned in recovery diagnostics. Quota exhaustion (HTTP 402) is classified as
`payment_required` / `api_4xx` in tool telemetry.


### Independent phone-format layouts

`get_layout` includes `format_layouts` for sizes edited separately from the main phone layout. Editing `mobile` intentionally preserves those independent designs. To edit Duo Open, read the language and variant first, then call `transform_layout` with `formatId: "ios-duo-inner"` and operations (omit `layouts`). To return that size to the main design, call the same tool with `formatId`, `resetFormat: true`, no operations, and the fresh read receipt. `save_layout` also accepts the complete `formatLayouts` map: omit it to preserve existing overrides; `{}` resets all overrides. `list_export_formats` includes `ios.phone.duo-inner` and `ios.phone.duo-outer`; preset exports use the same saved format as the editor. Store-validated Fastlane exports retain the ten-image iOS limit.
# App Store creative editing

Product Page Header (`app_store_header`, 3840×1646) and Search Results Creative
(`app_store_search`, 1920×1280) use the same graphics tools as social designs.
Prepare/browse/apply styles, then read with `get_graphics_format` and save the
complete edited layout with `save_graphics_format`, passing the fresh read receipt.
Text, images, logos, device frames, backgrounds and positions remain editable;
the save returns the existing result-preview widget. Other formats are preserved.
Header preparation accepts 1–7 screenshots; other formats require 3–7.
These tools edit designs inside AppLaunchFlow, not published App Store listings.
