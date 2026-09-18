import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createAppLaunchFlowServer } from "./index.js";
import { MCP_APP_MIME_TYPE, MCP_WIDGET_DOMAIN } from "./ui/picker-resource.js";

test("every widget has the same dedicated domain, separate from its asset origin", async () => {
  const api = createServer((request, response) => {
    assert.equal(request.headers.authorization, undefined);
    const path = request.url || "";
    if (path.startsWith("/mcp-assets/") && path.endsWith(".html")) {
      response.setHeader("content-type", "text/html");
      response.end(`<script src="${path.replace(/\.html$/, "-test.js")}"></script>`);
    } else if (path.endsWith("-test.js")) {
      response.setHeader("content-type", "application/javascript");
      response.end('document.getElementById("root").textContent = "test";');
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const server = createAppLaunchFlowServer({ baseUrl, token: "test-token" });
  const client = new Client({ name: "widget-domain-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const { resources } = await client.listResources();
    const widgets = resources.filter((resource) => resource.mimeType === MCP_APP_MIME_TYPE);
    assert.equal(widgets.length, 6);
    for (const widget of widgets) {
      const result = await client.readResource({ uri: widget.uri });
      const content = result.contents[0];
      const ui = content._meta?.ui as { domain: string; csp: { resourceDomains: string[] } };
      assert.equal(ui.domain, MCP_WIDGET_DOMAIN, widget.name);
      assert.equal(content._meta?.["openai/widgetDomain"], ui.domain);
      assert.notEqual(ui.domain, baseUrl);
      assert.ok(ui.csp.resourceDomains.includes(baseUrl));
      assert.ok("text" in content && content.text.includes(`<base href="${baseUrl}/">`));
    }
  } finally {
    await client.close();
    await server.close();
    await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
  }
});
