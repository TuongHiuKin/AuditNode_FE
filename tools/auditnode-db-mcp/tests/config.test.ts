import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  formatConfigurationError,
  loadConfig,
} from "../src/config.js";

const validEnvironment = {
  POSTGRES_HOST: "127.0.0.1",
  POSTGRES_PORT: "5432",
  POSTGRES_DATABASE: "AuditNode.db",
  POSTGRES_USER: "auditnode_chat_reader",
  POSTGRES_PASSWORD: "do-not-log-this-password",
  AUDITNODE_DB_SSL_MODE: "disable",
  AUDITNODE_OWNER_ID: "owner-under-test",
  AUDITNODE_MCP_QUERY_TIMEOUT_MS: "5000",
  AUDITNODE_MCP_MAX_ROWS: "200",
};

describe("loadConfig", () => {
  it("parses bounded read-only query settings", () => {
    const config = loadConfig(validEnvironment);

    expect(config.ownerId).toBe("owner-under-test");
    expect(config.queryTimeoutMs).toBe(5_000);
    expect(config.maxRows).toBe(200);
    expect(config.database.ssl).toBe(false);
  });

  it("rejects unsafe row and timeout limits", () => {
    expect(() =>
      loadConfig({
        ...validEnvironment,
        AUDITNODE_MCP_QUERY_TIMEOUT_MS: "60000",
      }),
    ).toThrow(z.ZodError);

    expect(() =>
      loadConfig({
        ...validEnvironment,
        AUDITNODE_MCP_MAX_ROWS: "10000",
      }),
    ).toThrow(z.ZodError);
  });

  it("does not include secret values in configuration errors", () => {
    let capturedError: unknown;
    try {
      loadConfig({
        ...validEnvironment,
        POSTGRES_HOST: "",
      });
    } catch (error) {
      capturedError = error;
    }

    const message = formatConfigurationError(capturedError);
    expect(message).toContain("POSTGRES_HOST");
    expect(message).not.toContain(validEnvironment.POSTGRES_PASSWORD);
  });
});
