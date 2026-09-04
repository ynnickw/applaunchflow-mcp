import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { SCREENSHOT_PICKER_URI } from "./ui/screenshot-picker.js";

test("inline picker resource, private data, authenticated read, validation, and failures", async () => {
  const requests: string[] = [];
  let denied = false;
  let stale = false;
  let assetMissing = false;
  const api = createServer((req, res) => {
    requests.push(req.url || "");
    if (req.url === "/mcp-assets/screenshot-picker.html") {
      assert.equal(
        req.headers.authorization,
        undefined,
        "public widget must not receive OAuth tokens",
      );
      res.writeHead(assetMissing ? 404 : 200, { "content-type": "text/html" });
      res.end(
        '<!doctype html><html><head></head><body><script src="/mcp-assets/screenshot-picker-test.js"></script></body></html>',
      );
      return;
    }
    if (req.url === "/mcp-assets/screenshot-picker-test.js") {
      assert.equal(req.headers.authorization, undefined);
      res.writeHead(200, { "content-type": "application/javascript" });
      res.end('document.getElementById("root").textContent = "picker";');
      return;
    }
    assert.equal(req.headers.authorization, "Bearer test-token");
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/screenshots/generate") {
      res.end(
        JSON.stringify({
          catalogKey: "a".repeat(64),
          cacheHit: true,
          templatePayloads: { default: {} },
        }),
      );
      return;
    }
    if (req.url === "/api/screenshots/apply-template") {
      assert.equal(req.method, "POST");
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        assert.deepEqual(JSON.parse(body), {
          generationId: project,
          catalogKey: "a".repeat(64),
          templateId: "default",
          paletteMode: "v2",
        });
        res.end(
          JSON.stringify({
            variantId: "00000000-0000-4000-8000-000000000002",
            detectedLanguage: "en",
          }),
        );
      });
      return;
    }
    if (req.url?.startsWith("/api/app/")) {
      res
        .writeHead(denied ? 403 : 200)
        .end(JSON.stringify(denied ? { error: "Forbidden" } : { id: project }));
      return;
    }
    if (req.url?.startsWith("/api/screenshots/template-catalog?")) {
      res.writeHead(stale ? 400 : 200).end(
        JSON.stringify(
          stale
            ? { error: "Catalog expired" }
            : {
                templateIds: ["default"],
                paletteOptions: {},
                templateLayoutsByDevice: {
                  phone: {
                    default: {
                      screens: [],
                      privateAsset:
                        "https://example.invalid/signed-private-image",
                    },
                    __internal: {},
                  },
                },
              },
        ),
      );
      return;
    }
    res.writeHead(404).end("{}");
  });
  const project = "00000000-0000-4000-8000-000000000001";
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const server = createAppLaunchFlowServer({ baseUrl, token: "test-token" });
  const client = new Client({ name: "picker-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  const args = { generationId: project, catalogKey: "a".repeat(64) };
  try {
    const { tools } = await client.listTools();
    const prepareTool = tools.find(
      (item) => item.name === "prepare_screenshot_styles",
    )!;
    assert.equal(
      (prepareTool._meta?.ui as any).resourceUri,
      SCREENSHOT_PICKER_URI,
    );
    assert.equal(
      prepareTool._meta?.["openai/outputTemplate"],
      SCREENSHOT_PICKER_URI,
    );
    const tool = tools.find((t) => t.name === "render_screenshot_picker")!;
    assert.equal((tool._meta?.ui as any).resourceUri, SCREENSHOT_PICKER_URI);
    assert.equal(tool._meta?.["openai/outputTemplate"], SCREENSHOT_PICKER_URI);
    assert.equal(tool.annotations?.readOnlyHint, true);
    const resource = await client.readResource({ uri: SCREENSHOT_PICKER_URI });
    assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
    assert.ok("text" in resource.contents[0]);
    assert.match(
      resource.contents[0].text,
      new RegExp(`<base href="${baseUrl}/">`),
    );
    assert.match(resource.contents[0].text, /textContent = "picker"/);
    assert.doesNotMatch(resource.contents[0].text, /<script[^>]+src=/);
    assert.equal(resource.contents[0]._meta?.["openai/widgetDomain"], undefined);
    assert.equal(
      (resource.contents[0]._meta?.ui as any).csp.frameDomains,
      undefined,
    );
    const result = await client.callTool({ name: tool.name, arguments: args });
    assert.equal(result.isError, undefined);
    assert.equal((result.structuredContent as any).success, true);
    assert.deepEqual((result.structuredContent as any).data.templateIds, [
      "default",
    ]);
    assert.ok(
      (result._meta?.picker as any).templateLayoutsByDevice.phone.default
        .privateAsset,
    );
    assert.equal(
      JSON.stringify(result.structuredContent).includes("signed-private-image"),
      false,
    );
    assert.match(
      (result.structuredContent as any).data.galleryUrl,
      /action=apply/,
    );
    assert.ok(requests.at(-2)?.startsWith("/api/app/"));
    assert.ok(
      requests.at(-1)?.startsWith("/api/screenshots/template-catalog?"),
    );
    const prepared = await client.callTool({
      name: prepareTool.name,
      arguments: {
        generationId: project,
        selectedScreenshotPaths: ["one.png", "two.png", "three.png"],
        deviceType: "phone",
      },
    });
    assert.equal((prepared.structuredContent as any).success, true);
    assert.ok((prepared._meta?.picker as any).templateLayoutsByDevice);
    assert.equal(
      (prepared.structuredContent as any).message,
      "Reused personalized screenshot styles; picker ready",
    );
    const applied = await client.callTool({
      name: "apply_screenshot_style",
      arguments: { ...args, templateId: "default", paletteMode: "v2" },
    });
    assert.equal(applied.isError, undefined);
    assert.match(
      (applied.structuredContent as any).data.editorUrl,
      /variantId=00000000-0000-4000-8000-000000000002/,
    );
    assert.equal(
      requests.filter((path) => path === "/api/screenshots/apply-template")
        .length,
      1,
    );
    denied = true;
    const before = requests.length;
    assert.equal(
      (await client.callTool({ name: tool.name, arguments: args })).isError,
      true,
    );
    assert.equal(
      requests.length,
      before + 1,
      "unauthorized read must not fetch catalog",
    );
    denied = false;
    stale = true;
    assert.equal(
      (await client.callTool({ name: tool.name, arguments: args })).isError,
      true,
    );
    const invalidBefore = requests.length;
    assert.equal(
      (
        await client.callTool({
          name: tool.name,
          arguments: { ...args, catalogKey: "bad" },
        })
      ).isError,
      true,
    );
    assert.equal(requests.length, invalidBefore);
    assetMissing = true;
    await assert.rejects(
      client.readResource({ uri: SCREENSHOT_PICKER_URI }),
      /assets are unavailable/,
    );
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve) => api.close(() => resolve()));
  }
});
