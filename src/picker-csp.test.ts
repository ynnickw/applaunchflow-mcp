import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { SCREENSHOT_PICKER_URI } from "./ui/screenshot-picker.js";
import { SOCIAL_GRAPHICS_PICKER_URI } from "./ui/social-graphics-picker.js";
import { PROMO_VIDEO_PICKER_URI } from "./ui/promo-video-picker.js";

test("all picker CSPs allow production Storage in ChatGPT and MCP Apps", async (t) => {
  const origin = "https://dashboard.applaunchflow.com";
  t.mock.method(globalThis, "fetch", async (input: string | URL) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin);
    if (url.pathname.endsWith(".js")) {
      return new Response("export {};", {
        headers: { "content-type": "application/javascript" },
      });
    }
    const prefix = url.pathname.split("/").pop()!.replace(".html", "");
    return new Response(`<script src="/mcp-assets/${prefix}-test.js"></script>`, {
      headers: { "content-type": "text/html" },
    });
  });
  const server = createAppLaunchFlowServer({ baseUrl: origin, token: "test-token" });
  const client = new Client({ name: "picker-csp-test", version: "1" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
  try {
    for (const uri of [SCREENSHOT_PICKER_URI, SOCIAL_GRAPHICS_PICKER_URI, PROMO_VIDEO_PICKER_URI]) {
      const resource = await client.readResource({ uri });
      const meta = resource.contents[0]._meta as {
        ui: { csp: { resourceDomains: string[]; connectDomains: string[] } };
        "openai/widgetCSP": { resource_domains: string[]; connect_domains: string[] };
      };
      const expected = [
        origin,
        "https://ubvbpgodmmitzutgshzu.supabase.co",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ];
      // Exact equality also guards against stale projects, wildcards and
      // accidental localhost access in a production sandbox.
      assert.deepEqual(meta.ui.csp.resourceDomains, expected, uri);
      assert.deepEqual(meta.ui.csp.connectDomains, expected, uri);
      assert.deepEqual(meta["openai/widgetCSP"].resource_domains, expected, uri);
      assert.deepEqual(meta["openai/widgetCSP"].connect_domains, expected, uri);
    }
  } finally {
    await client.close();
    await server.close();
  }
});
