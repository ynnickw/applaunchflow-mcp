import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const pluginJson = JSON.parse(
  await readFile(
    new URL("../.claude-plugin/plugin.json", import.meta.url),
    "utf8",
  ),
);
const mcpJson = JSON.parse(
  await readFile(new URL("../.mcp.json", import.meta.url), "utf8"),
);

test("Claude plugin metadata stays aligned with the release", () => {
  assert.equal(pluginJson.name, "applaunchflow");
  assert.equal(pluginJson.displayName, "AppLaunchFlow");
  assert.equal(pluginJson.version, packageJson.version);
  assert.equal(
    pluginJson.repository,
    "https://github.com/ynnickw/applaunchflow-mcp",
  );
});

test("Claude plugin uses the hosted OAuth MCP endpoint", () => {
  assert.deepEqual(mcpJson, {
    mcpServers: {
      applaunchflow: {
        type: "http",
        url: "https://mcp.applaunchflow.com/mcp",
      },
    },
  });
});
