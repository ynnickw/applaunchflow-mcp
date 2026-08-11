# AppLaunchFlow MCP

MCP server for AppLaunchFlow — create App Store & Google Play screenshots with AI.

## Connect

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

## Hosted service

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
3. `browse_templates` with the returned `templateIds`, `generationId`, and `catalogKey`
4. `apply_screenshot_style` with the returned `catalogKey`

For social graphics:

1. `list_source_screenshots`
2. `prepare_social_graphics_styles` with 3-7 ordered paths
3. `browse_social_templates` with the returned `templateIds`, `generationId`, and `catalogKey`
4. `apply_social_graphics_style` with the returned `catalogKey`

The screenshot result includes phone, tablet, and desktop. The social result includes all six supported formats. `generate_layouts` and `generate_graphics` remain available for legacy direct single-template calls.

## Development

```bash
npm ci
npm run dev
```

Run `npm test` before publishing or deploying. See
[`docs/openai-submission.md`](docs/openai-submission.md) for the final OpenAI
submission checklist and manual test cases.
