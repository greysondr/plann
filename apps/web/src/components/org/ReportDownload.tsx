"use client";

import { Button } from "@/components/ui";

// Excel abre CSV con acentos correctamente solo si el archivo lleva BOM UTF-8.
export function ReportDownload({ filename, rows }: { filename: string; rows: Record<string, string | number>[] }) {
  function download() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return (
    <Button type="button" onClick={download} disabled={rows.length === 0}>
      Descargar Excel (CSV)
    </Button>
  );
}
