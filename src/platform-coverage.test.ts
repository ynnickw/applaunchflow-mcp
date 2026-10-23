import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { AppLaunchFlowApiError } from "./client/api.js";
import { createAppLaunchFlowServer } from "./index.js";
import { mediaDurationSeconds } from "./media-duration.js";
import { buildCapabilities } from "./tools/capabilities.js";
import { selectTrackedKeywordIds } from "./tools/keywords.js";
import { limitRecovery } from "./tools/limit-recovery.js";
import {
  dashboardUrl,
  parseAppStoreId,
  toSafeProjectState,
} from "./tools/projects.js";
import { mergeStoreListing } from "./tools/store-listing.js";
import { fail } from "./tools/utils.js";
import { TOOL_ANNOTATIONS } from "./tool-metadata.js";

const BASE = "https://dashboard.applaunchflow.com";
const PROJECT = "00000000-0000-4000-8000-000000000001";
const VARIANT = "00000000-0000-4000-8000-0000000000a1";
const EMPTY_VARIANT = "00000000-0000-4000-8000-0000000000a2";

function apiError(status: number, body: unknown) {
  const error = new AppLaunchFlowApiError("rejected", status, body);
  error.baseUrl = BASE;
  return error;
}

test("plan and quota rejections carry non-retryable recovery with an upgrade URL", () => {
  const cases: Array<[number, unknown, string]> = [
    // Legacy dashboard route body and v1 gateway problem bodies.
    [403, { code: "VARIANT_LIMIT_REACHED", error: "Variant limit reached" }, "variant_limit"],
    [403, { code: "variant_limit_reached", detail: "Variant limit reached for your plan" }, "variant_limit"],
    [403, { code: "project_limit_reached", detail: "Project limit reached" }, "project_limit"],
    [402, { code: "keyword_limit", detail: "keyword_limit" }, "keyword_limit"],
    // Deployed gateway before the code passthrough: generic code + detail.
    [402, { code: "request_rejected", detail: "keyword_limit" }, "keyword_limit"],
    [402, { code: "competitor_limit", detail: "competitor_limit" }, "competitor_limit"],
    [403, { code: "plan_limit_reached", detail: "Translation limit reached for your plan" }, "translation_limit"],
    [403, { code: "request_rejected", detail: "Translation feature requires a subscription" }, "translation_limit"],
    [402, { code: "api_export_quota_exhausted", detail: "Monthly allowance used" }, "api_export_quota"],
    [403, { code: "api_pro_required", detail: "Pro required" }, "api_plan_required"],
    [403, { code: "plan_limit_reached", detail: "Illustration limit reached" }, "plan_limit"],
  ];
  for (const [status, body, kind] of cases) {
    const recovery = limitRecovery(apiError(status, body));
    assert.equal(recovery?.kind, kind, JSON.stringify(body));
    assert.equal(recovery?.retryable, false);
    assert.equal(recovery?.upgradeUrl, `${BASE}/`);
  }

  const rate = apiError(429, { code: "rate_limited", detail: "Slow down" });
  rate.retryAfter = 12;
  assert.deepEqual(
    { ...limitRecovery(rate), guidance: undefined },
    { kind: "rate_limit", retryable: true, retryAfterSeconds: 12, guidance: undefined },
  );
  // Ordinary validation and access errors are not limits.
  assert.equal(limitRecovery(apiError(422, { code: "validation_error" })), null);
  assert.equal(limitRecovery(apiError(403, { code: "forbidden" })), null);
  assert.equal(limitRecovery(new Error("plain")), null);

  const result = fail(
    apiError(402, { code: "keyword_limit", detail: "keyword_limit" }),
  );
  const error = (result.structuredContent as { error: Record<string, any> }).error;
  assert.equal(error.recovery.kind, "keyword_limit");
  assert.match(result.content[0].text, /Retrying the same call will fail again/);
  assert.match(result.content[0].text, /remove_keywords/);
});

test("project state exposes linked store ids and absolute dashboard URLs", () => {
  assert.equal(
    dashboardUrl("/editor?projectId=p&variantId=v", BASE),
    `${BASE}/editor?projectId=p&variantId=v`,
  );
  // Relative URLs never leave the dashboard origin.
  assert.equal(dashboardUrl("//evil.example/x", BASE), undefined);
  assert.equal(dashboardUrl("https://evil.example/x", BASE), "https://evil.example/x");
  assert.equal(dashboardUrl("http://evil.example/x", BASE), undefined);

  const state = toSafeProjectState(
    {
      project: {
        id: PROJECT,
        name: "Luna",
        metadata: { appleAppId: "123456789", googlePlayPackageName: "com.luna" },
      },
      content: {
        screenshots: { type: "screenshots", variants: [], editUrl: `/editor?projectId=${PROJECT}` },
        asoCopy: { type: "asoCopy", variants: [], editUrl: `/asocopy?projectId=${PROJECT}` },
      },
    },
    BASE,
  ) as { project: Record<string, unknown>; content: Record<string, any> };
  assert.equal(state.project.appleAppId, "123456789");
  assert.equal(state.project.googlePlayPackageName, "com.luna");
  assert.equal(state.project.primaryStoreProvider, "app_store");
  assert.equal(state.project.hubUrl, `${BASE}/app/${PROJECT}`);
  assert.equal(state.content.screenshots.editUrl, `${BASE}/editor?projectId=${PROJECT}`);
  assert.equal(state.content.asoCopy.editUrl, `${BASE}/asocopy?projectId=${PROJECT}`);

  const play = toSafeProjectState({
    project: { id: PROJECT, metadata: { googlePlayPackageName: "com.luna" } },
  }) as { project: Record<string, unknown> };
  assert.equal(play.project.primaryStoreProvider, "google_play");

  assert.equal(parseAppStoreId("284882215"), "284882215");
  assert.equal(
    parseAppStoreId("https://apps.apple.com/us/app/facebook/id284882215?mt=8"),
    "284882215",
  );
  assert.equal(parseAppStoreId("https://example.com/id284882215"), undefined);
  assert.equal(parseAppStoreId("facebook"), undefined);
});

test("keyword removal resolves text to tracked rows and reports unknown input", () => {
  const tracked = [
    { id: "a", storeProvider: "app_store", keyword: "photo editor", country: "us", lang: "en-US" },
    { id: "b", storeProvider: "app_store", keyword: "photo editor", country: "de", lang: "de-DE" },
    { id: "c", storeProvider: "google_play", keyword: "photo editor", country: "us", lang: "en-US" },
    { id: "d", storeProvider: "app_store", keyword: "collage", country: "us", lang: "en-US" },
  ] as const;
  const rows = tracked.map((row) => ({ ...row }));
  assert.deepEqual(
    selectTrackedKeywordIds(rows, { keywords: [" Photo  Editor "] }).ids.sort(),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    selectTrackedKeywordIds(rows, {
      keywords: ["photo editor"],
      storeProvider: "app_store",
      countries: ["DE"],
    }).ids,
    ["b"],
  );
  assert.deepEqual(
    selectTrackedKeywordIds(rows, { keywords: ["nope"], trackedKeywordIds: ["d", "zzz"] }),
    { ids: ["d"], missing: ["zzz", "nope"] },
  );
});

test("store listing edits merge onto the saved copy", () => {
  const current = {
    promotionalText: "Old promo",
    fullDescription: "Long text",
    insights: { promotionalText: { explanation: "x" } },
    translations: {
      de: { promotionalText: "Alt", fullDescription: "Lang", whatsNew: "Neu" },
      fr: { promotionalText: "Ancien" },
    },
  };
  const { asoCopy, confirmedWhatsNewLanguages } = mergeStoreListing(
    current,
    { promotionalText: "New promo" },
    { de: { whatsNew: "Fehler behoben" } },
  );
  assert.equal(asoCopy.promotionalText, "New promo");
  assert.equal(asoCopy.fullDescription, "Long text");
  assert.deepEqual(asoCopy.insights, current.insights);
  assert.deepEqual(asoCopy.translations.de, {
    promotionalText: "Alt",
    fullDescription: "Lang",
    whatsNew: "Fehler behoben",
  });
  assert.deepEqual(asoCopy.translations.fr, current.translations.fr);
  assert.deepEqual(confirmedWhatsNewLanguages, ["de"]);
  assert.throws(
    () => mergeStoreListing(current, undefined, { ja: { promotionalText: "x" } }),
    /translate_store_listing/,
  );
});

test("capabilities only list registered tools and give per-project dashboard links", () => {
  const caps = buildCapabilities(
    BASE,
    PROJECT,
    new Set(Object.keys(TOOL_ANNOTATIONS)),
  );
  const registered = new Set(Object.keys(TOOL_ANNOTATIONS));
  for (const area of caps.areas)
    for (const tool of area.tools) assert.ok(registered.has(tool), tool);
  const promo = caps.areas.find((area) => area.id === "promoVideo")!;
  assert.ok(promo.tools.includes("update_promo_video"));
  assert.equal(promo.editorUrl, `${BASE}/promovideo?projectId=${PROJECT}`);
  const byFeature = Object.fromEntries(
    caps.notAvailableViaMcp.map((entry) => [entry.feature, entry.dashboardUrl]),
  );
  assert.equal(byFeature["A/B tests"], `${BASE}/app/${PROJECT}?section=abtests`);
  assert.equal(
    byFeature["Publishing to App Store Connect / Google Play"],
    `${BASE}/app/${PROJECT}`,
  );
  assert.equal(byFeature["Billing and plans"], `${BASE}/`);
  for (const feature of [
    "Custom product pages and Apple product page assets",
    "Reviews",
    "App icon (Icon Composer)",
    "Website builder",
    "Export history",
    "Collaborators",
  ])
    assert.ok(byFeature[feature]?.startsWith(BASE), feature);

  const noProject = buildCapabilities(BASE, undefined, new Set(["get_layout"]));
  assert.ok(noProject.notAvailableViaMcp.every((entry) => entry.dashboardUrl === `${BASE}/`));
  assert.deepEqual(
    noProject.areas.find((area) => area.id === "screenshots")!.tools,
    ["get_layout"],
  );
});

function mp4(version: 0 | 1, timescale: number, duration: number) {
  const ftyp = Buffer.alloc(16);
  ftyp.writeUInt32BE(16, 0);
  ftyp.write("ftypisom", 4, "latin1");
  const body = Buffer.alloc(version === 1 ? 32 : 20);
  body.writeUInt8(version, 0);
  if (version === 1) {
    body.writeUInt32BE(timescale, 20);
    body.writeBigUInt64BE(BigInt(duration), 24);
  } else {
    body.writeUInt32BE(timescale, 12);
    body.writeUInt32BE(duration, 16);
  }
  const mvhd = Buffer.concat([Buffer.alloc(8), body]);
  mvhd.writeUInt32BE(mvhd.length, 0);
  mvhd.write("mvhd", 4, "latin1");
  const moov = Buffer.concat([Buffer.alloc(8), mvhd]);
  moov.writeUInt32BE(moov.length, 0);
  moov.write("moov", 4, "latin1");
  return Buffer.concat([ftyp, moov]);
}

function wav(seconds: number, byteRate = 88200) {
  const dataBytes = Math.round(seconds * byteRate);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "latin1");
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8, "latin1");
  header.write("fmt ", 12, "latin1");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(44100, 24);
  header.writeUInt32LE(byteRate, 28);
  header.write("data", 36, "latin1");
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

function mp3(frames: number) {
  // MPEG-1 Layer III, 128 kbps, 44.1 kHz, no padding: 417-byte frames.
  const frame = Buffer.alloc(417);
  frame.writeUInt32BE(0xfffb9000, 0);
  return Buffer.concat(Array.from({ length: frames }, () => frame));
}

test("upload durations are read from MP4/MOV, WAV and MP3 headers", () => {
  assert.equal(mediaDurationSeconds(mp4(0, 600, 2100), "video/mp4"), 3.5);
  assert.equal(mediaDurationSeconds(mp4(1, 44100, 264600), "audio/mp4"), 6);
  assert.equal(mediaDurationSeconds(wav(4.2), "audio/wav"), 4.2);
  // 100 frames × 1152 samples / 44100 Hz
  assert.equal(mediaDurationSeconds(mp3(100), "audio/mpeg"), 2.612);
  assert.equal(mediaDurationSeconds(Buffer.from("OggS...."), "audio/ogg"), undefined);
  assert.equal(mediaDurationSeconds(Buffer.alloc(3), "video/mp4"), undefined);
  assert.equal(mediaDurationSeconds(Buffer.from("garbage data here!"), "audio/mpeg"), undefined);
});

type Recorded = { method: string; path: string; query: URLSearchParams; body: any };

async function withDashboard(
  routes: (request: Recorded) => { status?: number; body: unknown } | undefined,
  run: (client: Client, calls: Recorded[], base: string) => Promise<void>,
) {
  const calls: Recorded[] = [];
  const api = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const url = new URL(request.url ?? "/", "http://local");
    const recorded: Recorded = {
      method: request.method ?? "GET",
      path: url.pathname,
      query: url.searchParams,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined,
    };
    calls.push(recorded);
    const result = routes(recorded);
    if (!result) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "not_found", detail: "no route" }));
      return;
    }
    const status = result.status ?? 200;
    response.writeHead(status, {
      "content-type": status >= 400 ? "application/problem+json" : "application/json",
    });
    response.end(
      JSON.stringify(status >= 400 ? result.body : { data: result.body, meta: { requestId: "r" } }),
    );
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAppLaunchFlowServer({ baseUrl: base, token: "t" });
  const client = new Client({ name: "platform-test", version: "1" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    await run(client, calls, base);
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve) => api.close(() => resolve()));
  }
}

function data(result: any) {
  return result.structuredContent?.data;
}

const variantList = {
  variants: [
    { id: VARIANT, label: "v1", is_active: false, has_content: true },
    { id: EMPTY_VARIANT, label: "v2", is_active: false, has_content: false },
  ],
  activeVariant: null,
};

test("variant tools: empty creation, guarded activation, confirmed deletion, duplicate URL", async () => {
  await withDashboard(
    ({ method, path }) => {
      if (method === "GET" && path === "/api/v1/variants") return { body: variantList };
      if (method === "POST" && path === "/api/v1/variants")
        return { body: { variant: { id: EMPTY_VARIANT, is_active: false } } };
      if (method === "PATCH" && path === `/api/v1/variants/${VARIANT}`)
        return { body: { variant: { id: VARIANT, is_active: true } } };
      if (method === "DELETE" && path === `/api/v1/variants/${VARIANT}`)
        return { body: { deletedVariantId: VARIANT, promotedVariant: null } };
      if (method === "POST" && path === `/api/v1/variants/${VARIANT}/duplicate`)
        return {
          body: {
            variant: { id: "00000000-0000-4000-8000-0000000000a3", generation_id: PROJECT, content_type: "promoVideo" },
          },
        };
      return undefined;
    },
    async (client, calls, base) => {
      const refused = await client.callTool({
        name: "create_variant",
        arguments: { generationId: PROJECT, contentType: "screenshots", setActive: true },
      });
      assert.equal(refused.isError, true);
      assert.equal(calls.length, 0, "no variant is created when setActive is requested");

      const created = await client.callTool({
        name: "create_variant",
        // projectId alias for generationId
        arguments: { projectId: PROJECT, contentType: "screenshots" },
      });
      assert.equal(created.isError, undefined);
      assert.equal(data(created).empty, true);
      assert.deepEqual(calls.at(-1)!.body, { generationId: PROJECT, contentType: "screenshots" });

      const empty = await client.callTool({
        name: "set_active_variant",
        arguments: { projectId: PROJECT, contentType: "screenshots", variantId: EMPTY_VARIANT },
      });
      assert.equal(empty.isError, true);
      assert.ok(!calls.some((call) => call.method === "PATCH"));

      const activated = await client.callTool({
        name: "set_active_variant",
        arguments: { projectId: PROJECT, contentType: "screenshots", variantId: VARIANT },
      });
      assert.equal(activated.isError, undefined);
      assert.deepEqual(calls.at(-1)!.body, { isActive: true });
      assert.equal(
        data(activated).editorUrl,
        `${base}/editor?projectId=${PROJECT}&variantId=${VARIANT}&device=phone`,
      );

      const unconfirmed = await client.callTool({
        name: "delete_variant",
        arguments: { projectId: PROJECT, contentType: "screenshots", variantId: VARIANT },
      });
      assert.equal(unconfirmed.isError, true);
      assert.ok(!calls.some((call) => call.method === "DELETE"));
      const deleted = await client.callTool({
        name: "delete_variant",
        arguments: { projectId: PROJECT, contentType: "screenshots", variantId: VARIANT, confirm: true },
      });
      assert.equal(deleted.isError, undefined);
      assert.equal(calls.at(-1)!.method, "DELETE");

      const foreign = await client.callTool({
        name: "delete_variant",
        arguments: {
          projectId: PROJECT,
          contentType: "screenshots",
          variantId: "00000000-0000-4000-8000-0000000000ff",
          confirm: true,
        },
      });
      assert.equal(foreign.isError, true);

      const duplicated = await client.callTool({
        name: "duplicate_variant",
        arguments: { variantId: VARIANT },
      });
      assert.equal(
        data(duplicated).editorUrl,
        `${base}/promovideo?projectId=${PROJECT}&variantId=00000000-0000-4000-8000-0000000000a3`,
      );
    },
  );
});

test("keyword tools let the server resolve the linked app and remove by keyword text", async () => {
  await withDashboard(
    ({ method, path }) => {
      if (method === "POST" && path === "/api/v1/keywords")
        return { body: { ok: true, added: 2, staleCount: 2, storeProvider: "google_play", appId: null } };
      if (method === "GET" && path === "/api/v1/keywords")
        return {
          body: {
            rows: [],
            limit: 10,
            summary: {},
            trackedKeywords: [
              { id: "00000000-0000-4000-8000-00000000000b", storeProvider: "app_store", keyword: "sleep", country: "us", lang: "en-US" },
              { id: "00000000-0000-4000-8000-00000000000c", storeProvider: "app_store", keyword: "sleep", country: "de", lang: "de-DE" },
            ],
          },
        };
      if (method === "DELETE" && path === "/api/v1/keywords") return { body: { ok: true, removed: 2 } };
      if (method === "GET" && path === "/api/v1/keywords/competitors")
        return { body: { competitors: [{ appId: "111" }, { appId: "222" }], limit: 5, storeProvider: "app_store" } };
      if (method === "PUT" && path === "/api/v1/keywords/competitors")
        return { body: { competitors: [], limit: 5, storeProvider: "app_store" } };
      return undefined;
    },
    async (client, calls) => {
      const added = await client.callTool({
        name: "add_keywords",
        arguments: { projectId: PROJECT, keywords: ["sleep", "rain"] },
      });
      assert.equal(added.isError, undefined);
      const post = calls.find((call) => call.method === "POST")!;
      assert.equal(post.body.appId, undefined, "no client-side app resolution");
      assert.equal(post.body.storeProvider, undefined);
      assert.equal(post.body.country, "us");
      assert.match(data(added).note, /no linked store app/);
      assert.ok(!calls.some((call) => call.path.startsWith("/api/v1/projects/")));

      const removed = await client.callTool({
        name: "remove_keywords",
        arguments: { projectId: PROJECT, keywords: ["Sleep"] },
      });
      assert.equal(removed.isError, undefined);
      assert.deepEqual(calls.at(-1)!.body, {
        ids: ["00000000-0000-4000-8000-00000000000b", "00000000-0000-4000-8000-00000000000c"],
      });

      const before = calls.length;
      const unknown = await client.callTool({
        name: "remove_keywords",
        arguments: { projectId: PROJECT, keywords: ["sleep", "nope"] },
      });
      assert.equal(unknown.isError, true);
      assert.ok(!calls.slice(before).some((call) => call.method === "DELETE"));

      await client.callTool({
        name: "add_keyword_competitors",
        arguments: { projectId: PROJECT, appIds: ["333", "111"] },
      });
      assert.deepEqual(calls.at(-1)!.body, {
        projectId: PROJECT,
        appIds: ["111", "222", "333"],
        storeProvider: "app_store",
      });
      await client.callTool({
        name: "remove_keyword_competitors",
        arguments: { projectId: PROJECT, appIds: ["111"] },
      });
      assert.deepEqual(calls.at(-1)!.body.appIds, ["222"]);
    },
  );
});

test("plan-limit failures from the dashboard reach the agent with recovery guidance", async () => {
  await withDashboard(
    ({ method, path }) =>
      method === "POST" && path === "/api/v1/variants"
        ? { status: 403, body: { code: "variant_limit_reached", detail: "Variant limit reached for your plan" } }
        : undefined,
    async (client, _calls, base) => {
      const result: any = await client.callTool({
        name: "create_variant",
        arguments: { generationId: PROJECT, contentType: "mockups" },
      });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent.error.recovery.kind, "variant_limit");
      assert.equal(result.structuredContent.error.recovery.upgradeUrl, `${base}/`);
      assert.match(result.content[0].text, /delete_variant/);
    },
  );
});

test("create_project imports an App Store app and links it", async () => {
  await withDashboard(
    ({ method, path }) => {
      if (method === "GET" && path === "/api/v1/itunes/lookup")
        return {
          body: {
            results: [
              {
                storeAppId: "284882215",
                name: "Luna Breath",
                category: "Health & Fitness",
                description: "Breathe.",
                iconUrl: "https://is1-ssl.mzstatic.com/icon.png",
                storeUrl: "https://apps.apple.com/app/id284882215",
              },
            ],
          },
        };
      if (method === "POST" && path === "/api/v1/projects")
        return { body: { project: { id: PROJECT, name: "Luna Breath", metadata: { appleAppId: "284882215" } } } };
      return undefined;
    },
    async (client, calls, base) => {
      const result = await client.callTool({
        name: "create_project",
        arguments: { appStore: "https://apps.apple.com/de/app/luna/id284882215", country: "DE" },
      });
      assert.equal(result.isError, undefined);
      assert.equal(calls[0].query.get("id"), "284882215");
      assert.equal(calls[0].query.get("country"), "de");
      const metadata = calls[1].body.metadata;
      assert.equal(calls[1].body.name, "Luna Breath");
      assert.equal(metadata.appleAppId, "284882215");
      assert.equal(metadata.primaryStoreProvider, "app_store");
      assert.equal(metadata.category, "Health & Fitness");
      assert.equal(metadata.logoUrl, "https://is1-ssl.mzstatic.com/icon.png");
      assert.equal(data(result).project.hubUrl, `${base}/app/${PROJECT}`);

      const missing = await client.callTool({ name: "create_project", arguments: {} });
      assert.equal(missing.isError, true);
    },
  );
});

test("generationId tools accept projectId and reject conflicting ids", async () => {
  await withDashboard(
    ({ method, path }) =>
      method === "GET" && path === "/api/v1/variants" ? { body: variantList } : undefined,
    async (client, calls) => {
      const viaAlias = await client.callTool({
        name: "list_variants",
        arguments: { projectId: PROJECT, contentType: "screenshots" },
      });
      assert.equal(viaAlias.isError, undefined);
      assert.equal(calls.at(-1)!.query.get("generationId"), PROJECT);

      const conflicting = await client.callTool({
        name: "list_variants",
        arguments: {
          projectId: PROJECT,
          generationId: "00000000-0000-4000-8000-000000000002",
          contentType: "screenshots",
        },
      });
      assert.equal(conflicting.isError, true);
      const neither = await client.callTool({
        name: "list_variants",
        arguments: { contentType: "screenshots" },
      });
      assert.equal(neither.isError, true);
    },
  );
});

test("update_store_listing merges partial edits and saves the full copy", async () => {
  let saved: any = {
    promotionalText: "Old",
    shortDescription: "Sub",
    fullDescription: "Full",
    keywords: "a,b",
    insights: { keep: true },
    category: "Health",
    subcategory: "Fitness",
    translations: { de: { promotionalText: "Alt" } },
  };
  await withDashboard(
    ({ method, path, body }) => {
      if (path !== "/api/v1/aso/copy") return undefined;
      if (method === "GET") return { body: { asoCopy: saved } };
      if (method === "PUT") {
        saved = body.asoCopy;
        return { body: { success: true } };
      }
      return undefined;
    },
    async (client, calls) => {
      const result = await client.callTool({
        name: "update_store_listing",
        arguments: {
          projectId: PROJECT,
          fields: { promotionalText: "New" },
          translations: { de: { whatsNew: "Neu" } },
        },
      });
      assert.equal(result.isError, undefined);
      const put = calls.find((call) => call.method === "PUT")!;
      assert.equal(put.body.generationId, PROJECT);
      assert.deepEqual(put.body.confirmedWhatsNewLanguages, ["de"]);
      assert.equal(put.body.asoCopy.promotionalText, "New");
      assert.deepEqual(put.body.asoCopy.insights, { keep: true });
      assert.deepEqual(put.body.asoCopy.translations.de, { promotionalText: "Alt", whatsNew: "Neu" });

      const tooLong = await client.callTool({
        name: "update_store_listing",
        arguments: { projectId: PROJECT, fields: { promotionalText: "x".repeat(171) } },
      });
      assert.equal(tooLong.isError, true);
    },
  );
});
