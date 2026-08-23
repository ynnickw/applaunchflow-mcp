export const APPLAUNCHFLOW_MCP_NAME = "applaunchflow";
export const APPLAUNCHFLOW_MCP_URL = "https://mcp.applaunchflow.com/mcp";

export function codexAddArgs(): string[] {
  return [
    "mcp",
    "add",
    APPLAUNCHFLOW_MCP_NAME,
    "--url",
    APPLAUNCHFLOW_MCP_URL,
  ];
}

export function codexLoginArgs(): string[] {
  return ["mcp", "login", APPLAUNCHFLOW_MCP_NAME];
}

export function codexStatusArgs(): string[] {
  return ["mcp", "get", APPLAUNCHFLOW_MCP_NAME];
}

export function codexInspectArgs(): string[] {
  return [...codexStatusArgs(), "--json"];
}

export function isHostedCodexConfig(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const transport = (value as { transport?: unknown }).transport;
  if (!transport || typeof transport !== "object") return false;

  const { type, url } = transport as { type?: unknown; url?: unknown };
  return type === "streamable_http" && url === APPLAUNCHFLOW_MCP_URL;
}

export function codexDisconnectArgs(): string[] {
  return ["mcp", "remove", APPLAUNCHFLOW_MCP_NAME];
}

export function claudeAddArgs(): string[] {
  return [
    "mcp",
    "add",
    "--transport",
    "http",
    APPLAUNCHFLOW_MCP_NAME,
    APPLAUNCHFLOW_MCP_URL,
  ];
}

export function claudeLoginArgs(): string[] {
  return ["mcp", "login", APPLAUNCHFLOW_MCP_NAME];
}

export function claudeStatusArgs(): string[] {
  return ["mcp", "get", APPLAUNCHFLOW_MCP_NAME];
}

export function claudeDisconnectArgs(): string[] {
  return ["mcp", "remove", APPLAUNCHFLOW_MCP_NAME];
}

export function isHostedClaudeConfig(output: string): boolean {
  const normalized = output.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
  const hasHttpTransport = /^\s*Type:\s*http\s*$/im.test(normalized);
  const configuredUrl = normalized.match(/^\s*URL:\s*(\S+)\s*$/im)?.[1];
  return hasHttpTransport && configuredUrl === APPLAUNCHFLOW_MCP_URL;
}
