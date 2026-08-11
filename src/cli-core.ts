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

export function codexDisconnectArgs(): string[] {
  return ["mcp", "remove", APPLAUNCHFLOW_MCP_NAME];
}
