import { promises as fs } from "fs";
import os from "os";
import path from "path";

export interface StoredCredentials {
  baseUrl: string;
  token: string;
  cookieName: string;
  createdAt: string;
  expiresAt?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".applaunchflow");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

function defaultCookieName(baseUrl: string): string {
  return baseUrl.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}

export async function loadStoredCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await fs.readFile(CREDENTIALS_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredCredentials;
    return {
      ...parsed,
      baseUrl: normalizeBaseUrl(parsed.baseUrl),
    };
  } catch {
    return null;
  }
}

export async function saveStoredCredentials(
  credentials: StoredCredentials,
): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(
    CREDENTIALS_PATH,
    `${JSON.stringify(credentials, null, 2)}\n`,
    "utf8",
  );
}

export async function clearStoredCredentials(): Promise<void> {
  await fs.rm(CREDENTIALS_PATH, { force: true });
}

export async function resolveCredentials(): Promise<StoredCredentials> {
  const baseUrl = normalizeBaseUrl(
    process.env.APPLAUNCHFLOW_BASE_URL || "https://dashboard.applaunchflow.com",
  );
  const envToken = process.env.APPLAUNCHFLOW_MCP_TOKEN;

  if (envToken) {
    return {
      baseUrl,
      token: envToken,
      cookieName:
        process.env.APPLAUNCHFLOW_MCP_COOKIE_NAME || defaultCookieName(baseUrl),
      createdAt: new Date().toISOString(),
    };
  }

  const stored = await loadStoredCredentials();
  if (!stored) {
    throw new Error(
      `No AppLaunchFlow MCP credentials found. Run \`applaunchflow-mcp auth login --base-url ${baseUrl}\`.`,
    );
  }

  return stored;
}
