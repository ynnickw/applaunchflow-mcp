import assert from "node:assert/strict";
import test from "node:test";
import {
  APPLAUNCHFLOW_MCP_NAME,
  APPLAUNCHFLOW_MCP_URL,
  claudeAddArgs,
  claudeDisconnectArgs,
  claudeLoginArgs,
  claudeStatusArgs,
  codexAddArgs,
  codexDisconnectArgs,
  codexInspectArgs,
  codexLoginArgs,
  codexStatusArgs,
  isHostedClaudeConfig,
  isHostedCodexConfig,
} from "./cli-core.js";

test("Codex convenience commands use the hosted OAuth connector", () => {
  assert.deepEqual(codexAddArgs(), [
    "mcp",
    "add",
    APPLAUNCHFLOW_MCP_NAME,
    "--url",
    APPLAUNCHFLOW_MCP_URL,
  ]);
  assert.deepEqual(codexLoginArgs(), ["mcp", "login", "applaunchflow"]);
  assert.deepEqual(codexStatusArgs(), ["mcp", "get", "applaunchflow"]);
  assert.deepEqual(codexInspectArgs(), [
    "mcp",
    "get",
    "applaunchflow",
    "--json",
  ]);
  assert.deepEqual(codexDisconnectArgs(), [
    "mcp",
    "remove",
    "applaunchflow",
  ]);
});

test("Claude Code convenience commands use the hosted OAuth connector", () => {
  assert.deepEqual(claudeAddArgs(), [
    "mcp",
    "add",
    "--transport",
    "http",
    APPLAUNCHFLOW_MCP_NAME,
    APPLAUNCHFLOW_MCP_URL,
  ]);
  assert.deepEqual(claudeLoginArgs(), ["mcp", "login", "applaunchflow"]);
  assert.deepEqual(claudeStatusArgs(), ["mcp", "get", "applaunchflow"]);
  assert.deepEqual(claudeDisconnectArgs(), [
    "mcp",
    "remove",
    "applaunchflow",
  ]);
});

test("detects whether Claude Code already uses the hosted connector", () => {
  assert.equal(
    isHostedClaudeConfig(`applaunchflow:
  Scope: Local config
  Type: http
  URL: ${APPLAUNCHFLOW_MCP_URL}`),
    true,
  );
  assert.equal(
    isHostedClaudeConfig(`applaunchflow:
  Type: stdio
  Command: npx -y @applaunchflow/mcp@latest`),
    false,
  );
  assert.equal(
    isHostedClaudeConfig(`applaunchflow:
  Type: http
  URL: https://example.com/mcp`),
    false,
  );
  assert.equal(
    isHostedClaudeConfig(
      `\u001b[32mType: http\u001b[0m\nURL: ${APPLAUNCHFLOW_MCP_URL}`,
    ),
    true,
  );
});

test("detects whether Codex already uses the hosted connector", () => {
  assert.equal(
    isHostedCodexConfig({
      transport: {
        type: "streamable_http",
        url: APPLAUNCHFLOW_MCP_URL,
      },
    }),
    true,
  );
  assert.equal(
    isHostedCodexConfig({
      transport: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@applaunchflow/mcp@latest"],
      },
    }),
    false,
  );
  assert.equal(
    isHostedCodexConfig({
      transport: {
        type: "streamable_http",
        url: "https://example.com/mcp",
      },
    }),
    false,
  );
  assert.equal(isHostedCodexConfig(null), false);
});

test("the public connector URL is a secure MCP endpoint", () => {
  const url = new URL(APPLAUNCHFLOW_MCP_URL);
  assert.equal(url.protocol, "https:");
  assert.equal(url.pathname, "/mcp");
});
