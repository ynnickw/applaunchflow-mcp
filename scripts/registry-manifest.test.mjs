import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const serverJson = JSON.parse(
  await readFile(new URL("../server.json", import.meta.url), "utf8"),
);

test("official MCP Registry manifest describes the production remote server", () => {
  assert.equal(serverJson.name, "io.github.ynnickw/applaunchflow");
  assert.equal(serverJson.version, packageJson.version);
  assert.deepEqual(serverJson.remotes, [
    {
      type: "streamable-http",
      url: "https://mcp.applaunchflow.com/mcp",
    },
  ]);
  assert.deepEqual(serverJson.repository, {
    url: "https://github.com/ynnickw/applaunchflow-mcp",
    source: "github",
  });
});
