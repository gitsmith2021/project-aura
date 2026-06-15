// Dependency-free Excel workbook generation via SpreadsheetML 2003 (XML).
//
// Excel, LibreOffice and Google Sheets all open this format natively, and it
// supports MULTIPLE NAMED SHEETS — which CSV cannot — so the NAAC SSR
// workbook can ship one sheet per criterion without adding exceljs/xlsx to
// the bundle. Files download as .xls; Excel shows a one-time "format differs
// from extension" prompt and opens them fine. Revisit a real .xlsx library
// only if institutions need styling beyond bold headers.
//
// Pure string building — usable from client components for blob downloads.

export type SheetCell = string | number | null;

export type Sheet = {
  /** Max 31 chars, no \ / ? * [ ] : — enforced by sanitizeSheetName. */
  name: string;
  /** First row is rendered bold (header). */
  rows: SheetCell[][];
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
}

function cellXml(cell: SheetCell, header: boolean): string {
  const style = header ? ' ss:StyleID="hdr"' : "";
  if (cell == null) return `<Cell${style}/>`;
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return `<Cell${style}><Data ss:Type="Number">${cell}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`;
}

/** Builds a complete SpreadsheetML workbook string. */
export function buildWorkbookXml(sheets: Sheet[]): string {
  const sheetXml = sheets
    .map((sheet) => {
      const rows = sheet.rows
        .map(
          (row, i) =>
            `<Row>${row.map((cell) => cellXml(cell, i === 0)).join("")}</Row>`
        )
        .join("\n");
      return `<Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}"><Table>\n${rows}\n</Table></Worksheet>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1"/></Style>
</Styles>
${sheetXml}
</Workbook>`;
}

/** Browser-only: builds the workbook and triggers a download. */
export function downloadWorkbook(filename: string, sheets: Sheet[]): void {
  const xml = buildWorkbookXml(sheets);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
