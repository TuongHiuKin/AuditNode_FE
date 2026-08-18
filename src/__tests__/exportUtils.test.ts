import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { escapeSpreadsheetFormula, exportToExcel } from "../shared/utils/exportUtils";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("exportUtils", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["=cmd", "+cmd", "-cmd", "@cmd", "  =cmd", "\t+cmd"])(
    "escapes formula-prefixed value %j",
    (value) => expect(escapeSpreadsheetFormula(value)).toBe(`'${value}`),
  );

  it("leaves ordinary values and numbers unchanged", () => {
    expect(escapeSpreadsheetFormula("api-server")).toBe("api-server");
    expect(escapeSpreadsheetFormula(443)).toBe(443);
  });

  it("sanitizes every exported cell before loading SheetJS", async () => {
    await exportToExcel([{ Name: " \t@payload", Port: 443 }], "audit");
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([{ Name: "' \t@payload", Port: 443 }]);
  });
});
