"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

const CHANNELS = [
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "directo", label: "Otro" },
];

// Un enlace por canal (?src=): así el detalle del evento muestra de dónde llega la gente.
export function SharePanel({ baseUrl, qr }: { baseUrl: string; qr: string }) {
  const [channel, setChannel] = useState("instagram");
  const [copied, setCopied] = useState(false);
  const url = channel === "directo" ? baseUrl : `${baseUrl}?src=${channel}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia este enlace", url);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-[260px] flex-1 space-y-3">
        <p className="text-[12.5px] leading-relaxed text-foreground-3">Elige dónde lo vas a publicar y copia el enlace: así sabrás cuánta gente llega desde cada canal.</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button key={c.id} type="button" onClick={() => setChannel(c.id)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${channel === c.id ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input readOnly value={url} className="w-full rounded-xl border border-border-strong bg-surface-muted px-3.5 py-2.5 font-mono text-[12.5px] text-foreground-2" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" onClick={copy}>
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Código QR del evento" className="h-[132px] w-[132px] rounded-xl border border-border bg-white p-2" />
        <p className="mt-1 text-[11.5px] text-foreground-3">QR del evento</p>
      </div>
    </div>
  );
}
