# applaunchflow MCP

Local stdio MCP server for applaunchflow.

## Auth

```bash
pnpm --dir applaunchflow-mcp dev auth login --base-url http://localhost:3000
```

Credentials are stored in `~/.applaunchflow/credentials.json`.

Environment overrides:

- `applaunchflow_BASE_URL`
- `applaunchflow_MCP_TOKEN`
- `applaunchflow_MCP_COOKIE_NAME`

## Run

```bash
pnpm --dir applaunchflow-mcp build
node applaunchflow-mcp/build/index.js
```

The server uses stdio transport and exposes tools/resources for project, screenshot, layout, template, variant, graphics, and ASO workflows.
