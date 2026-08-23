import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPLAUNCHFLOW_MCP_URL } from "./cli-core.js";

async function runConnectClaude(getOutput: string, getStatus = 0) {
  const directory = await mkdtemp(join(tmpdir(), "applaunchflow-cli-"));
  const executable = join(directory, "claude");
  const logPath = join(directory, "claude.log");
  await writeFile(
    executable,
    `#!/bin/sh
printf '%s\\n' "$*" >> "$CLAUDE_TEST_LOG"
if [ "$*" = "mcp get applaunchflow" ]; then
  printf '%s' "$CLAUDE_GET_OUTPUT"
  exit "$CLAUDE_GET_STATUS"
fi
`,
  );
  await chmod(executable, 0o755);

  try {
    const cliPath = fileURLToPath(new URL("./cli.js", import.meta.url));
    const result = spawnSync(process.execPath, [cliPath, "connect", "claude"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH ?? ""}`,
        CLAUDE_TEST_LOG: logPath,
        CLAUDE_GET_OUTPUT: getOutput,
        CLAUDE_GET_STATUS: String(getStatus),
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return (await readFile(logPath, "utf8")).trim().split("\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("Claude helper adds a missing connector and starts OAuth", async () => {
  assert.deepEqual(await runConnectClaude("", 1), [
    "mcp get applaunchflow",
    `mcp add --transport http applaunchflow ${APPLAUNCHFLOW_MCP_URL}`,
    "mcp login applaunchflow",
  ]);
});

test("Claude helper replaces a legacy connector before starting OAuth", async () => {
  assert.deepEqual(
    await runConnectClaude("Type: stdio\nCommand: npx legacy-server"),
    [
      "mcp get applaunchflow",
      "mcp remove applaunchflow",
      `mcp add --transport http applaunchflow ${APPLAUNCHFLOW_MCP_URL}`,
      "mcp login applaunchflow",
    ],
  );
});

test("Claude helper keeps the hosted connector and refreshes OAuth", async () => {
  assert.deepEqual(
    await runConnectClaude(
      `Type: http\nURL: ${APPLAUNCHFLOW_MCP_URL}\nStatus: Connected`,
    ),
    ["mcp get applaunchflow", "mcp login applaunchflow"],
  );
});
