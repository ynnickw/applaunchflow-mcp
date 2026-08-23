#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
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

function printHelp(): void {
  console.log(`AppLaunchFlow MCP

Usage:
  applaunchflow connect codex
  applaunchflow connect claude
  applaunchflow connect chatgpt
  applaunchflow status
  applaunchflow disconnect
  applaunchflow url`);
}

function runCodex(args: string[]): void {
  const result = spawnSync("codex", args, { stdio: "inherit" });
  if (result.error) {
    throw new Error(`Could not run Codex: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Codex exited with status ${result.status ?? "unknown"}`);
  }
}

function runClaude(args: string[]): void {
  const result = spawnSync("claude", args, { stdio: "inherit" });
  if (result.error) {
    throw new Error(`Could not run Claude Code: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Claude Code exited with status ${result.status ?? "unknown"}`,
    );
  }
}

function getCodexConfiguration(): "missing" | "hosted" | "legacy" {
  const result = spawnSync("codex", codexInspectArgs(), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.error) {
    throw new Error(`Could not run Codex: ${result.error.message}`);
  }
  if (result.status !== 0) return "missing";

  try {
    return isHostedCodexConfig(JSON.parse(result.stdout))
      ? "hosted"
      : "legacy";
  } catch {
    return "legacy";
  }
}

function connectCodex(): void {
  const configuration = getCodexConfiguration();
  if (configuration === "legacy") {
    console.log("Replacing the legacy local AppLaunchFlow MCP configuration...");
    runCodex(codexDisconnectArgs());
  }
  if (configuration !== "hosted") {
    runCodex(codexAddArgs());
    return;
  }
  runCodex(codexLoginArgs());
}

function getClaudeConfiguration(): "missing" | "hosted" | "legacy" {
  const result = spawnSync("claude", claudeStatusArgs(), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.error) {
    throw new Error(`Could not run Claude Code: ${result.error.message}`);
  }
  if (result.status !== 0) return "missing";
  return isHostedClaudeConfig(result.stdout) ? "hosted" : "legacy";
}

function connectClaude(): void {
  const configuration = getClaudeConfiguration();
  if (configuration === "legacy") {
    console.log("Replacing the legacy local AppLaunchFlow MCP configuration...");
    runClaude(claudeDisconnectArgs());
  }
  if (configuration !== "hosted") {
    runClaude(claudeAddArgs());
  }
  runClaude(claudeLoginArgs());
}

function connectChatGpt(): void {
  console.log(`Add a custom MCP connector in ChatGPT using this URL:\n${APPLAUNCHFLOW_MCP_URL}`);
}

function main(): void {
  const [command, target] = process.argv.slice(2);

  if (command === "connect" && target === "codex") {
    connectCodex();
    return;
  }
  if (command === "connect" && target === "claude") {
    connectClaude();
    return;
  }
  if (command === "connect" && target === "chatgpt") {
    connectChatGpt();
    return;
  }
  if (command === "status") {
    runCodex(codexStatusArgs());
    return;
  }
  if (command === "disconnect") {
    runCodex(codexDisconnectArgs());
    return;
  }
  if (command === "url") {
    console.log(APPLAUNCHFLOW_MCP_URL);
    return;
  }

  printHelp();
  if (command) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
