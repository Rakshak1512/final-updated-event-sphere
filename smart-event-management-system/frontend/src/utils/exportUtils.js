/**
 * CSV Export Utilities for EventSphere
 * Converts real current data structures to clean, formatted CSV downloads.
 */
import { downloadBlobOrFile } from "./fileDownload.js";

function sanitizeField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    const emptyContent = headers.map(sanitizeField).join(",") + "\n";
    downloadBlob(filename, emptyContent);
    return;
  }

  const csvRows = [];
  // Header row
  csvRows.push(headers.map(sanitizeField).join(","));

  // Data rows
  for (const row of rows) {
    csvRows.push(row.map(sanitizeField).join(","));
  }

  const csvString = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel compatibility
  downloadBlob(filename, csvString);
}

function downloadBlob(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const targetFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  downloadBlobOrFile(blob, targetFilename, "text/csv;charset=utf-8;").catch((err) => {
    console.error("CSV download error:", err);
  });
}

export function slugifyFilename(title, suffix) {
  const clean = (title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${clean}-${suffix}.csv`;
}
