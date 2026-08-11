#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  APPLAUNCHFLOW_MCP_URL,
  codexAddArgs,
  codexDisconnectArgs,
  codexLoginArgs,
  codexStatusArgs,
} from "./cli-core.js";

function printHelp(): void {
  console.log(`AppLaunchFlow MCP

Usage:
  applaunchflow connect codex
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

function codexIsConfigured(): boolean {
  const result = spawnSync("codex", codexStatusArgs(), { stdio: "ignore" });
  if (result.error) {
    throw new Error(`Could not run Codex: ${result.error.message}`);
  }
  return result.status === 0;
}

function connectCodex(): void {
  if (!codexIsConfigured()) {
    runCodex(codexAddArgs());
  }
  runCodex(codexLoginArgs());
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
