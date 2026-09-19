"use client";

import { Button } from "@/components/ui";

// Abre el diálogo de impresión del navegador: ahí se elige "Guardar como PDF".
export function PrintButton({ label = "Imprimir o guardar PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="ghost" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
