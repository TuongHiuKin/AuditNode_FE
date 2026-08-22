import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import {
  createAuditNodeMcpServer,
} from "../src/server.js";
import {
  TOOL_NAMES,
  type AuditNodeQueryService,
} from "../src/queries.js";

describe("AuditNode MCP server", () => {
  it("lists exactly seven read-only tools and invokes the selected tool", async () => {
    const execute = vi.fn<AuditNodeQueryService["execute"]>(
      async (tool, limit) => ({
        tool,
        ownerScoped: tool !== "get_schema_summary",
        rows: [{ requested_limit: limit ?? null }],
        rowCount: 1,
        truncated: false,
      }),
    );
    const close = vi.fn(async () => undefined);
    const application = createAuditNodeMcpServer(() => ({
      execute,
      close,
    }));
    const client = new Client({
      name: "auditnode-db-mcp-smoke-test",
      version: "0.1.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await application.server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
      expect(
        listed.tools.every(
          (tool) =>
            tool.annotations?.readOnlyHint === true &&
            tool.annotations?.destructiveHint === false,
        ),
      ).toBe(true);

      const result = await client.callTool({
        name: "get_label_usage",
        arguments: { limit: 3 },
      });

      expect(result.isError).not.toBe(true);
      expect(execute).toHaveBeenCalledWith("get_label_usage", 3);
    } finally {
      await client.close();
      await application.close();
    }

    expect(close).toHaveBeenCalledOnce();
  });
});
