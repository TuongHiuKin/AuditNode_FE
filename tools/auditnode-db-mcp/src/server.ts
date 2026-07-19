import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  formatConfigurationError,
  loadConfig,
} from "./config.js";
import {
  PgAuditNodeQueryService,
  TOOL_DESCRIPTIONS,
  TOOL_NAMES,
  type AuditNodeQueryService,
  type ToolName,
} from "./queries.js";

type ServiceFactory = () => AuditNodeQueryService | Promise<AuditNodeQueryService>;

const limitInput = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum rows to return; capped by server configuration."),
};

export function createAuditNodeMcpServer(
  serviceFactory: ServiceFactory = () =>
    new PgAuditNodeQueryService(loadConfig()),
): {
  server: McpServer;
  close: () => Promise<void>;
} {
  const server = new McpServer({
    name: "auditnode-db-mcp",
    version: "0.1.0",
  });

  let servicePromise: Promise<AuditNodeQueryService> | undefined;

  const getService = (): Promise<AuditNodeQueryService> => {
    servicePromise ??= Promise.resolve().then(serviceFactory);
    return servicePromise;
  };

  const invoke = async (tool: ToolName, limit?: number) => {
    try {
      const service = await getService();
      const result = await service.execute(tool, limit);
      const structuredContent: Record<string, unknown> = {
        tool: result.tool,
        ownerScoped: result.ownerScoped,
        rows: result.rows,
        rowCount: result.rowCount,
        truncated: result.truncated,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent,
      };
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? formatConfigurationError(error)
          : "The read-only database query failed. Check MCP stderr logs and database availability.";

      console.error(
        `[auditnode-db-mcp] ${tool} failed:`,
        error instanceof Error ? error.name : "UnknownError",
      );

      return {
        isError: true,
        content: [{ type: "text" as const, text: message }],
      };
    }
  };

  for (const tool of TOOL_NAMES) {
    server.tool(
      tool,
      TOOL_DESCRIPTIONS[tool],
      limitInput,
      {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      ({ limit }) => invoke(tool, limit),
    );
  }

  return {
    server,
    close: async () => {
      if (servicePromise) {
        const service = await servicePromise.catch(() => undefined);
        await service?.close();
      }
      await server.close();
    },
  };
}

export async function main(): Promise<void> {
  const application = createAuditNodeMcpServer();
  const transport = new StdioServerTransport();

  const shutdown = async (): Promise<void> => {
    await application.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await application.server.connect(transport);
}

const entryPoint = process.argv[1];
if (entryPoint && pathToFileURL(entryPoint).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(
      "[auditnode-db-mcp] Fatal startup error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  });
}
