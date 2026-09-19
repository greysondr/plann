import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/plann-logo.svg" alt="Plann" width={28} height={28} />
            <span className="font-display text-[22px] leading-none text-foreground">plann</span>
          </Link>
          <span className="text-[12.5px] font-semibold text-foreground-3">Planes en Barquisimeto y Lara</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
      <footer className="mx-auto max-w-4xl px-5 pb-10 text-[12px] text-foreground-3">© Plann · Entradas, tours y experiencias en Lara</footer>
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value.toFixed(1)} de 5`} className="inline-flex" style={{ fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "text-pink" : "text-foreground-4"}>
          ★
        </span>
      ))}
    </span>
  );
}
