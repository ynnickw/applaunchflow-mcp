# AppLaunchFlow MCP

MCP server for AppLaunchFlow — create App Store & Google Play screenshots with AI.

## Setup

Add to your MCP client config (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "applaunchflow": {
      "command": "npx",
      "args": ["-y", "@applaunchflow/mcp@latest"]
    }
  }
}
```

## Auth

```bash
npx -y @applaunchflow/mcp@latest auth login
```

Credentials are stored in `~/.applaunchflow/credentials.json`.

Environment overrides:

- `applaunchflow_BASE_URL`
- `applaunchflow_MCP_TOKEN`
- `applaunchflow_MCP_COOKIE_NAME`

## Development

```bash
pnpm install
pnpm dev
```
