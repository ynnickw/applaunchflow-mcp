import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";
import { MCP_APP_MIME_TYPE, MCP_WIDGET_DOMAIN } from "./ui/picker-resource.js";
import {
  previousWidgetResourceUri,
  versionWidgetResourceUri,
  widgetMetadataFingerprint,
  widgetResourceMetadata,
} from "./ui/widget-metadata.js";

test("every widget keeps OpenAI's dedicated domain without overriding other hosts' sandbox identity", async () => {
  const api = createServer((request, response) => {
    assert.equal(request.headers.authorization, undefined);
    const path = request.url || "";
    if (path.startsWith("/mcp-assets/") && path.endsWith(".html")) {
      response.setHeader("content-type", "text/html");
      response.end(
        `<script src="${path.replace(/\.html$/, "-test.js")}"></script>`,
      );
    } else if (path.endsWith("-test.js")) {
      response.setHeader("content-type", "application/javascript");
      response.end('document.getElementById("root").textContent = "test";');
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const server = createAppLaunchFlowServer({ baseUrl, token: "test-token" });
  const client = new Client({ name: "widget-domain-test", version: "1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { resources } = await client.listResources();
    const widgets = resources.filter(
      (resource) => resource.mimeType === MCP_APP_MIME_TYPE,
    );
    assert.equal(widgets.length, 13);
    assert.ok(
      widgets.some((widget) => widget.uri.endsWith("layout-result-v2.html")),
    );
    assert.ok(
      widgets.some((widget) => widget.uri.endsWith("layout-result-v1.html")),
    );
    for (const widget of widgets) {
      const result = await client.readResource({ uri: widget.uri });
      const content = result.contents[0];
      const ui = content._meta?.ui as {
        domain?: string;
        csp: { resourceDomains: string[] };
      };
      assert.equal(ui.domain, undefined, widget.name);
      assert.equal(content._meta?.["openai/widgetDomain"], MCP_WIDGET_DOMAIN);
      assert.notEqual(MCP_WIDGET_DOMAIN, baseUrl);
      assert.ok(ui.csp.resourceDomains.includes(baseUrl));
      assert.ok(
        "text" in content && content.text.includes(`<base href="${baseUrl}/">`),
      );
    }
    const { tools } = await client.listTools();
    const linkedUris = new Set(
      tools.flatMap((tool) => {
        const uri = (tool._meta?.ui as { resourceUri?: string } | undefined)
          ?.resourceUri;
        return uri ? [uri] : [];
      }),
    );
    assert.equal(linkedUris.size, 6);
    for (const uri of linkedUris) {
      assert.ok(uri.includes(`-ui-${widgetMetadataFingerprint()}.html`), uri);
      assert.ok(
        widgets.some((widget) => widget.uri === uri),
        uri,
      );
      const previous = previousWidgetResourceUri(uri);
      assert.ok(previous);
      assert.ok(
        widgets.some((widget) => widget.uri === previous),
        previous,
      );
    }
    const retainedUris = [
      `ui://applaunchflow/project-list-${"a".repeat(64)}-ui-${"b".repeat(16)}.html`,
      `ui://applaunchflow/asset-list-${"c".repeat(64)}.html`,
      `ui://applaunchflow/screenshot-picker-v16-ui-${"d".repeat(16)}.html`,
      `ui://applaunchflow/social-graphics-picker-v16.html`,
      `ui://applaunchflow/promo-video-picker-v19.html`,
      `ui://applaunchflow/layout-result-v2-ui-${"e".repeat(16)}.html`,
    ];
    for (const uri of retainedUris) {
      const result = await client.readResource({ uri });
      assert.equal(result.contents[0].uri, uri);
      assert.equal(
        (result.contents[0]._meta?.ui as { domain?: string }).domain,
        undefined,
      );
    }
    await assert.rejects(
      client.readResource({
        uri: "ui://applaunchflow/project-list-untrusted.html",
      }),
    );
    await assert.rejects(
      client.readResource({
        uri: "ui://applaunchflow/asset-list-../../private.html",
      }),
    );
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve, reject) =>
      api.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("metadata-only policy changes invalidate widget URIs without changing their bundle", () => {
  const uri = "ui://applaunchflow/screenshot-picker-v17.html";
  const versioned = versionWidgetResourceUri(uri);
  assert.notEqual(versioned, uri);
  assert.equal(versionWidgetResourceUri(versioned), versioned);
  assert.equal(previousWidgetResourceUri(versioned), uri);
  const metadata = widgetResourceMetadata(
    "https://dashboard.applaunchflow.com",
    "AppLaunchFlow widget resource contract",
  );
  assert.equal(
    widgetMetadataFingerprint(metadata),
    widgetMetadataFingerprint(),
  );
  assert.notEqual(
    widgetMetadataFingerprint({
      ...metadata,
      ui: { ...metadata.ui, domain: MCP_WIDGET_DOMAIN },
    }),
    widgetMetadataFingerprint(),
  );
  assert.notEqual(
    widgetMetadataFingerprint({
      ...metadata,
      ui: { ...metadata.ui, prefersBorder: false },
    }),
    widgetMetadataFingerprint(),
  );
  assert.throws(() =>
    versionWidgetResourceUri("https://example.com/untrusted.html"),
  );
});
