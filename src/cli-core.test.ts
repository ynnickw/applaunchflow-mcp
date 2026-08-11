import assert from "node:assert/strict";
import test from "node:test";
import {
  APPLAUNCHFLOW_MCP_NAME,
  APPLAUNCHFLOW_MCP_URL,
  codexAddArgs,
  codexDisconnectArgs,
  codexLoginArgs,
  codexStatusArgs,
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
  assert.deepEqual(codexDisconnectArgs(), [
    "mcp",
    "remove",
    "applaunchflow",
  ]);
});

test("the public connector URL is a secure MCP endpoint", () => {
  const url = new URL(APPLAUNCHFLOW_MCP_URL);
  assert.equal(url.protocol, "https:");
  assert.equal(url.pathname, "/mcp");
});
