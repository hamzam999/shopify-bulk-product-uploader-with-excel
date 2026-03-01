import * as XLSX from "xlsx";
import type { RawRow } from "@/types/excel";

export async function parseExcelWorkbook(
  file: File
): Promise<{ workbook: XLSX.WorkBook; sheetNames: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) throw new Error("No sheets in workbook.");
  return { workbook, sheetNames };
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function getSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string
): { headers: string[]; rows: RawRow[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (!raw.length) return { headers: [], rows: [] };
  const firstRow = raw[0];
  const headers = (Array.isArray(firstRow) ? firstRow : [firstRow]).map((h, j) =>
    stringifyCell(h).trim() || `Column_${j}`
  );
  const rows: RawRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const arr = Array.isArray(row) ? row : [row];
    const record: RawRow = {};
    headers.forEach((header, j) => {
      record[header] = stringifyCell(arr[j]);
    });
    rows.push(record);
  }
  return { headers, rows };
}
