# Inline content pickers

`prepare_screenshot_styles` prepares the catalog. Call `render_screenshot_picker`
with the returned `generationId` and `catalogKey` to display an MCP Apps widget.
Its versioned `ui://applaunchflow/screenshot-picker-v1.html` resource links a
standalone dashboard renderer bundle. It does not embed the full dashboard.

The widget receives layouts and signed URLs through result `_meta`, compares V1
and V2, and calls `apply_screenshot_style` through the authenticated host bridge
only when the user clicks Create. Backend ownership and plan limits still apply.
After success it offers Open in editor. A failed or interrupted save is never
retried automatically. Unsupported clients retain the exact direct-apply gallery
URL.

The same standard MCP Apps contract is available for the other visual choice
flows:

- `prepare_social_graphics_styles` → `render_social_graphics_picker` renders the
  existing `SocialTemplateSelectorContent`, including every social template,
  format group, and V1/V2 palette. It calls `apply_social_graphics_style` only
  after confirmation.
- `generate_promo_video` → `render_promo_video_picker` renders the existing
  `PromoVideoResultPicker` with all three transient candidates. It calls
  `apply_promo_video_candidate`, which reloads the server-stored candidate by
  id and never accepts an arbitrary video config from the iframe.

All three tools publish the official `ui.resourceUri` and
`text/html;profile=mcp-app` contract used by Claude and other MCP Apps hosts.
OpenAI compatibility metadata remains alongside it. Private layouts, signed
URLs, and video configs stay in result `_meta`, outside model-visible structured
content.

## Local verification

In the dashboard repository (`applaunchflow`):

```sh
pnpm install
pnpm exec playwright install chromium
pnpm test:mcp-ui
pnpm test:mcp-ui:serve
```

The last command opens a test host at `http://127.0.0.1:4318`. It uses the official
MCP Apps host SDK, an opaque sandbox with CSP, actual shared 2D/3D rendering,
demo fixture data and mocked saves. No production credentials or writes are used.
The root page displays every registered screenshot template. Use
`?picker=social` for social graphics and `?picker=promo` for the three promo-video
concepts. Append `scenario=error` or `scenario=missing` for failure states.
Automated screenshot interaction tests can use `?templateIds=default,studio` to
keep their fixture intentionally small.

In this MCP repository, run `npm test` for transport/resource/auth tests.

## Deployment and real-host testing

1. Deploy the dashboard first. Its build now generates `public/mcp-assets`.
   Public bundle, font, device-model and renderer assets have CORS enabled;
   authenticated API routes do not.
2. Deploy/release this MCP version using the existing release workflow.
3. Refresh the connector's tool discovery in the target host. Prepare a catalog
   or candidate batch and invoke its matching `render_*_picker`. Verify each
   widget loads and creates a variant using a dedicated test account. Local
   harness tests do not establish that a particular Claude/ChatGPT host renders
   the widget.

Keep resource URIs versioned when changing the widget contract. If moving storage
to another origin, update the explicit resource CSP allowlist. Do not use wildcard
domains or pass OAuth tokens into the HTML. Nested iframe permissions are not needed.
