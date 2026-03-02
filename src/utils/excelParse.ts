import ExcelJS from "exceljs";
import type { RawRow } from "@/types/excel";

export async function parseExcelWorkbook(
  file: File
): Promise<{ workbook: ExcelJS.Workbook; sheetNames: string[] }> {
  const buffer = await file.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);

  if (!sheetNames.length) {
    throw new Error("No sheets in workbook.");
  }

  return { workbook, sheetNames };
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";

  // plain types
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return value.toISOString();

  // ExcelJS rich text
  if (
    typeof value === "object" &&
    value &&
    "richText" in value &&
    Array.isArray((value as any).richText)
  ) {
    return (value as any).richText
      .map((r: any) => r.text)
      .join("");
  }

  // ExcelJS formula
  if (
    typeof value === "object" &&
    value &&
    "formula" in value
  ) {
    return stringifyCell((value as any).result);
  }

  // ExcelJS text object
  if (
    typeof value === "object" &&
    value &&
    "text" in value
  ) {
    return String((value as any).text);
  }

  return "";
}

export function getSheetData(
  workbook: ExcelJS.Workbook,
  sheetName: string
): { headers: string[]; rows: RawRow[] } {
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }

  const headers: string[] = [];
  const rows: RawRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as unknown[];

    // ExcelJS row.values is 1-based index
    const arr = values.slice(1);

    if (rowNumber === 1) {
      arr.forEach((cell, j) => {
        const header =
          stringifyCell(cell).trim() || `Column_${j}`;
        headers.push(header);
      });
    } else {
      const record: RawRow = {};
      headers.forEach((header, j) => {
        record[header] = stringifyCell(arr[j]);
      });
      rows.push(record);
    }
  });

  return { headers, rows };
}