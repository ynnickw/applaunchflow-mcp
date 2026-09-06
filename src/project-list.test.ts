import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAppLaunchFlowServer } from "./index.js";
import { PROJECT_LIST_URI } from "./tools/projects.js";

test("list_projects exposes a read-only widget, keeps private icons out of model summaries and isolates accounts", async (t) => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const origin = "https://dashboard.applaunchflow.com";
  const requests: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(String(input));
      assert.equal(String(input), `${origin}/api/projects`);
      const token = new Headers(init?.headers).get("authorization");
      return Response.json({
        projects: [
          {
            id: projectId,
            name: token === "Bearer user-a" ? "NerdSip" : "Luna Breath",
            platform: "ios",
            user_id: "secret-owner",
            iconUrl: `https://ubvbpgodmmitzutgshzu.supabase.co/icon.png?token=${token === "Bearer user-a" ? "icon-a" : "icon-b"}`,
            metadata: {
              appDescription: "private-description",
              logoUrl: "https://old.example?expired-token",
            },
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Unsafe logo",
            iconUrl: "javascript:alert(1)",
          },
        ],
      });
    },
  );
  for (const token of ["user-a", "user-b"]) {
    const server = createAppLaunchFlowServer({ baseUrl: origin, token });
    const client = new Client({ name: "project-list-test", version: "1" });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    await client.connect(ct);
    try {
      const tools = await client.listTools();
      const tool = tools.tools.find((tool) => tool.name === "list_projects")!;
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool._meta?.["openai/outputTemplate"], PROJECT_LIST_URI);
      assert.deepEqual(tool._meta?.ui, { resourceUri: PROJECT_LIST_URI });
      const result = await client.callTool({
        name: "list_projects",
        arguments: {},
      });
      const modelOutput = JSON.stringify({
        content: result.content,
        structuredContent: result.structuredContent,
      });
      assert.doesNotMatch(
        modelOutput,
        /icon-[ab]|secret-owner|private-description|expired-token|javascript:/,
      );
      const meta = result._meta as {
        projectList: { projects: Record<string, unknown>[] };
      };
      assert.equal(
        meta.projectList.projects[0].name,
        token === "user-a" ? "NerdSip" : "Luna Breath",
      );
      assert.match(
        String(meta.projectList.projects[0].iconUrl),
        token === "user-a" ? /icon-a$/ : /icon-b$/,
      );
      assert.equal(
        meta.projectList.projects[0].projectUrl,
        `${origin}/app/${projectId}`,
      );
      assert.equal(meta.projectList.projects[1].iconUrl, undefined);
      const resource = await client.readResource({ uri: PROJECT_LIST_URI });
      assert.doesNotMatch(
        JSON.stringify(resource),
        /icon-[ab]|secret-owner|expired-token/,
      );
    } finally {
      await client.close();
      await server.close();
    }
  }
  assert.equal(
    requests.length,
    2,
    "only one authenticated API call per list, no per-project fetches in MCP",
  );
});
