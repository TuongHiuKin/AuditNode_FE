import { describe, expect, it } from "vitest";
import { getErrorMessage, getImportProblemIssues } from "../shared/utils/errorUtils";

describe("ProblemDetails error helpers", () => {
  it("prefers safe detail then title over the Axios transport message", () => {
    expect(getErrorMessage({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: { data: { title: "Invalid workbook", detail: "Correct row 2." } },
    }, "Fallback")).toBe("Correct row 2.");

    expect(getErrorMessage({
      isAxiosError: true,
      message: "Request failed with status code 409",
      response: { data: { title: "Inventory conflict" } },
    }, "Fallback")).toBe("Inventory conflict");
  });

  it("narrows structured import errors and conflicts from ProblemDetails extensions", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          extensions: {
            import: {
              errors: [{ row: 2, type: "Validation", message: "Bad IP" }],
              conflicts: [{ row: 3, appCode: "APP2", message: "Port collision" }],
            },
          },
        },
      },
    };

    expect(getImportProblemIssues(error)).toEqual([
      { kind: "error", row: 2, type: "Validation", message: "Bad IP", appCode: undefined },
      { kind: "conflict", row: 3, type: undefined, message: "Port collision", appCode: "APP2" },
    ]);
  });
});
