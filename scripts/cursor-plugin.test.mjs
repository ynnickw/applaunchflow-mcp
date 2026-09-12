import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cursor marketplace package points to the hosted OAuth server without credentials", async () => {
  const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  const manifest = await readJson("../.cursor-plugin/plugin.json");
  assert.equal(manifest.name, "applaunchflow");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.repository, "https://github.com/ynnickw/applaunchflow-mcp");
  assert.equal(manifest.mcpServers, "mcp.json");
  assert.deepEqual(await readJson("../mcp.json"), {
    mcpServers: { applaunchflow: { url: "https://mcp.applaunchflow.com/mcp" } },
  });
  const logo = await readFile(new URL(`../${manifest.logo}`, import.meta.url), "utf8");
  assert.match(logo, /<svg/);
  assert.doesNotMatch(logo, /<script|<foreignObject|href=/i);
});
