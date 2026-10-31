import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "../build/index.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const references = path.join(
  root,
  "plugins/claude/skills/applaunchflow/references",
);

export async function syncClaudeCatalogs({ check = false } = {}) {
  const server = createAppLaunchFlowServer(
    { baseUrl: "https://invalid.local", token: "synthetic-catalog-check" },
    { hosted: true },
  );
  const client = new Client({ name: "claude-catalog-check", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(a), client.connect(b)]);
    const tools = new Map(
      (await client.listTools()).tools.map((tool) => [tool.name, tool]),
    );
    let count = 0;
    for (const entry of await fs.readdir(references, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(references, entry.name, "tool-catalog.md");
      const source = await fs.readFile(file, "utf8");
      const names = [...source.matchAll(/^## (\w+)$/gm)].map(
        (match) => match[1],
      );
      assert.ok(names.length, `Missing tool owners in ${file}`);
      const sections = names.map((name) => {
        const tool = tools.get(name);
        assert.ok(tool, `Unknown documented tool ${name}`);
        return `## ${name}\n\n${tool.description || tool.title}\n\nInput schema:\n\n\`\`\`json\n${JSON.stringify(tool.inputSchema, null, 2)}\n\`\`\`\n`;
      });
      const header = source
        .slice(0, source.indexOf("\n## "))
        .trimEnd()
        .replace(/npm run sync:plugin-skills/g, "npm run sync:claude-catalogs");
      const expected = `${header}\n\n${sections.join("\n")}`;
      if (check)
        assert.equal(
          source,
          expected,
          `Stale catalog ${file}; run npm run sync:claude-catalogs`,
        );
      else await fs.writeFile(file, expected);
      count += names.length;
    }
    return count;
  } finally {
    await client.close();
    await server.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.log(
    `${await syncClaudeCatalogs({ check: process.argv.includes("--check") })} Claude tool references ${process.argv.includes("--check") ? "verified" : "synchronized"}.`,
  );
}
