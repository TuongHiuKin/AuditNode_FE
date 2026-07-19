const READ_ONLY_START = /^\s*(?:select|with)\b/i;
const SQL_COMMENT = /--|\/\*/;
const STATEMENT_SEPARATOR = /;/;
const MUTATING_KEYWORD =
  /\b(?:alter|analyze|call|comment|copy|create|delete|do|drop|execute|grant|insert|lock|merge|refresh|reindex|reset|revoke|set|truncate|update|vacuum)\b/i;

export function assertReadOnlySql(sql: string): void {
  if (!READ_ONLY_START.test(sql)) {
    throw new Error("Only SELECT or WITH queries are allowed.");
  }

  if (SQL_COMMENT.test(sql)) {
    throw new Error("SQL comments are not allowed.");
  }

  if (STATEMENT_SEPARATOR.test(sql)) {
    throw new Error("Multiple SQL statements are not allowed.");
  }

  if (MUTATING_KEYWORD.test(sql)) {
    throw new Error("A mutating SQL keyword was rejected.");
  }
}
