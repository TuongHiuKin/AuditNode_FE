import axios from "axios";

type UnknownRecord = Record<string, unknown>;

export interface ImportProblemIssue {
  row?: number;
  kind: "error" | "conflict";
  message: string;
  type?: string;
  appCode?: string;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function safeText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getProblemDetails(error: unknown): UnknownRecord | null {
  if (!axios.isAxiosError<unknown>(error)) return null;
  return asRecord(error.response?.data);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const problem = getProblemDetails(error);
  if (problem) {
    return safeText(problem.detail)
      ?? safeText(problem.title)
      ?? safeText(problem.message)
      ?? (axios.isAxiosError(error) ? safeText(error.message) : undefined)
      ?? fallback;
  }
  if (error instanceof Error) return safeText(error.message) ?? fallback;
  return fallback;
}

export function getImportProblemIssues(error: unknown): ImportProblemIssue[] {
  const problem = getProblemDetails(error);
  if (!problem) return [];

  const extensions = asRecord(problem.extensions);
  const importResult = asRecord(extensions?.import ?? problem.import);
  if (!importResult) return [];

  const issues: ImportProblemIssue[] = [];
  collectIssues(importResult.errors, "error", issues);
  collectIssues(importResult.conflicts, "conflict", issues);
  return issues;
}

function collectIssues(
  value: unknown,
  kind: ImportProblemIssue["kind"],
  target: ImportProblemIssue[],
) {
  if (!Array.isArray(value)) return;
  value.forEach((item) => {
    const record = asRecord(item);
    const message = safeText(record?.message);
    if (!record || !message) return;
    target.push({
      kind,
      message,
      row: typeof record.row === "number" && Number.isInteger(record.row) ? record.row : undefined,
      type: safeText(record.type),
      appCode: safeText(record.appCode),
    });
  });
}
