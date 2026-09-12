# AppLaunchFlow MCP

MCP server for AppLaunchFlow — create App Store & Google Play screenshots with AI.

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

### Inline screenshot picker

`prepare_screenshot_styles` returns the personalized V1/V2 picker directly in
MCP Apps-compatible hosts and creates a variant only after explicit user
confirmation through the authenticated tool bridge. Other hosts retain the
full-gallery link. Revisit prepared options using the existing widget or that
link; there is no separate render-tool call. Social graphics and promo video
use the same prepare-and-show flow.
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
3. The personalized gallery opens automatically. Compare each template's V1/V2 render and confirm the choice; the gallery creates the new variant from cache and opens the editor.

`browse_templates` can reopen a prepared catalog, and `apply_screenshot_style`
remains available when an API client supplies a template id directly.

For social graphics:

1. `list_source_screenshots`
2. `prepare_social_graphics_styles` with 3-7 ordered paths
3. `browse_social_templates` with the returned `templateIds`, `generationId`, and `catalogKey`
4. `apply_social_graphics_style` with the returned `catalogKey`

The screenshot result includes phone, tablet, and desktop. The social result includes every supported social, store-listing, and mobile-ad format. New screenshot and social-graphics variants always go through their visual pickers so the user explicitly chooses the template and palette.

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
