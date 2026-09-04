import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { SOCIAL_GRAPHICS_PICKER_URI } from "./ui/social-graphics-picker.js";
import { PROMO_VIDEO_PICKER_URI } from "./ui/promo-video-picker.js";

const project = "00000000-0000-4000-8000-000000000001";
const variant = "00000000-0000-4000-8000-000000000002";
const catalogKey = "a".repeat(64);
const candidateKey = "b".repeat(64);

test("social and promo pickers use standard MCP Apps metadata and server-owned apply data", async () => {
  const requests: Array<{ url: string; method: string; body?: unknown }> = [];
  const api = createServer((request, response) => {
    const url = request.url || "";
    requests.push({ url, method: request.method || "GET" });
    if (url.startsWith("/mcp-assets/")) {
      assert.equal(request.headers.authorization, undefined);
      if (url.endsWith("-test.js")) {
        response.writeHead(200, {
          "content-type": "application/javascript",
        });
        response.end('document.getElementById("root").textContent = "picker";');
        return;
      }
      const name = url.includes("social")
        ? "social-graphics-picker"
        : "promo-video-picker";
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><head></head><body><script src="/mcp-assets/${name}-test.js"></script></body></html>`,
      );
      return;
    }
    assert.equal(request.headers.authorization, "Bearer test-token");
    response.setHeader("content-type", "application/json");
    if (url === "/api/graphics/generate") {
      response.end(
        JSON.stringify({
          catalogKey,
          cacheHit: true,
          templatePayloads: { "social-clean": {} },
        }),
      );
      return;
    }
    if (url === "/api/promovideo/generate") {
      response.end(
        JSON.stringify({
          candidateKey,
          candidates: [1, 2, 3].map((number) => ({
            id: `candidate-${number}`,
            title: `Concept ${number}`,
            config: { marker: `generated-${number}` },
          })),
        }),
      );
      return;
    }
    if (url.startsWith("/api/app/")) {
      response.end(JSON.stringify({ id: project }));
      return;
    }
    if (url.startsWith("/api/graphics/template-catalog?")) {
      response.end(
        JSON.stringify({
          templateIds: ["social-clean"],
          paletteOptions: {},
          templateLayoutsByFormat: {
            instagram_post: {
              "social-clean": {
                screens: [],
                privateAsset: "https://example.invalid/social-signed",
              },
            },
          },
        }),
      );
      return;
    }
    if (url.startsWith("/api/promovideo/candidate-catalog?")) {
      response.end(
        JSON.stringify({
          generationId: project,
          candidateKey,
          screenshotPaths: ["mobile/one.png"],
          candidates: [1, 2, 3].map((number) => ({
            id: `candidate-${number}`,
            title: `Concept ${number}`,
            explanation: `Option ${number}`,
            durationInFrames: 450,
            config: { marker: `server-config-${number}` },
          })),
        }),
      );
      return;
    }
    if (url === `/api/projects/${project}/screenshots`) {
      response.end(
        JSON.stringify({
          paths: [`${project}/mobile/one.png`],
          screenshotUrls: ["https://example.invalid/screenshot-signed"],
          platforms: ["ios"],
          deviceTypes: ["phone"],
          defaultPlatform: "ios",
        }),
      );
      return;
    }
    if (url === "/api/promovideo/apply-candidate") {
      let raw = "";
      request.on("data", (chunk) => {
        raw += chunk;
      });
      request.on("end", () => {
        const body = JSON.parse(raw) as Record<string, unknown>;
        requests.at(-1)!.body = body;
        response.end(JSON.stringify({ variantId: variant }));
      });
      return;
    }
    response.writeHead(404).end("{}");
  });

  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const server = createAppLaunchFlowServer({ baseUrl, token: "test-token" });
  const client = new Client({ name: "picker-test", version: "1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const { tools } = await client.listTools();
    for (const [toolName, uri] of [
      ["prepare_social_graphics_styles", SOCIAL_GRAPHICS_PICKER_URI],
      ["generate_promo_video", PROMO_VIDEO_PICKER_URI],
      ["render_social_graphics_picker", SOCIAL_GRAPHICS_PICKER_URI],
      ["render_promo_video_picker", PROMO_VIDEO_PICKER_URI],
    ] as const) {
      const tool = tools.find((item) => item.name === toolName)!;
      assert.equal(
        (tool._meta?.ui as { resourceUri?: string }).resourceUri,
        uri,
      );
      assert.equal(tool._meta?.["openai/outputTemplate"], uri);
      assert.equal(
        tool.annotations?.readOnlyHint,
        toolName.startsWith("render_"),
      );
      const resource = await client.readResource({ uri });
      assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
      assert.ok("text" in resource.contents[0]);
      assert.match(
        resource.contents[0].text,
        new RegExp(`<base href="${baseUrl}/">`),
      );
      assert.match(
        resource.contents[0].text,
        new RegExp(
          `<meta name="applaunchflow-mcp-asset-origin" content="${baseUrl}">`,
        ),
      );
      assert.match(resource.contents[0].text, /textContent = "picker"/);
      assert.doesNotMatch(resource.contents[0].text, /<script[^>]+src=/);
      assert.equal(
        resource.contents[0]._meta?.["openai/widgetDomain"],
        undefined,
      );
    }

    const social = await client.callTool({
      name: "render_social_graphics_picker",
      arguments: {
        generationId: project,
        catalogKey,
        primaryFormat: "instagram_post",
      },
    });
    assert.equal((social.structuredContent as any).success, true);
    assert.deepEqual((social.structuredContent as any).data.templateIds, [
      "social-clean",
    ]);
    assert.equal(
      JSON.stringify(social.structuredContent).includes("social-signed"),
      false,
    );
    assert.match(
      (social.structuredContent as any).data.galleryUrl,
      /action=apply/,
    );
    assert.ok(
      (social._meta?.socialGraphicsPicker as any).templateLayoutsByFormat
        .instagram_post["social-clean"].privateAsset,
    );

    const promo = await client.callTool({
      name: "render_promo_video_picker",
      arguments: { projectId: project, candidateKey },
    });
    assert.equal((promo.structuredContent as any).success, true);
    assert.equal(
      JSON.stringify(promo.structuredContent).includes("server-config"),
      false,
    );
    assert.deepEqual((promo._meta?.promoVideoPicker as any).screenshotUrls, [
      "https://example.invalid/screenshot-signed",
    ]);

    const preparedSocial = await client.callTool({
      name: "prepare_social_graphics_styles",
      arguments: {
        generationId: project,
        selectedScreenshotPaths: ["one.png", "two.png", "three.png"],
        primaryFormat: "instagram_post",
      },
    });
    assert.equal((preparedSocial.structuredContent as any).success, true);
    assert.ok(
      (preparedSocial._meta?.socialGraphicsPicker as any)
        .templateLayoutsByFormat,
    );

    const preparedPromo = await client.callTool({
      name: "generate_promo_video",
      arguments: {
        projectId: project,
        selectedScreenshotPaths: ["one.png", "two.png", "three.png"],
      },
    });
    assert.equal((preparedPromo.structuredContent as any).success, true);
    assert.equal(
      (preparedPromo._meta?.promoVideoPicker as any).batch.candidates.length,
      3,
    );

    const applied = await client.callTool({
      name: "apply_promo_video_candidate",
      arguments: {
        projectId: project,
        candidateKey,
        candidateId: "candidate-2",
      },
    });
    assert.equal((applied.structuredContent as any).success, true);
    assert.match(
      (applied.structuredContent as any).data.editorUrl,
      new RegExp(variant),
    );
    const applyRequest = requests.find(
      (item) => item.url === "/api/promovideo/apply-candidate",
    )!;
    assert.deepEqual(applyRequest.body, {
      projectId: project,
      config: { marker: "server-config-2" },
      label: "Concept 2",
    });

    const invalid = await client.callTool({
      name: "apply_promo_video_candidate",
      arguments: { projectId: project, candidateKey, candidateId: "invented" },
    });
    assert.equal(invalid.isError, true);
    assert.equal(
      requests.filter((item) => item.url === "/api/promovideo/apply-candidate")
        .length,
      1,
    );
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve) => api.close(() => resolve()));
  }
});
