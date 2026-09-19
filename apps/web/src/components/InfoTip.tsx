"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Signo ⓘ pequeño: al pasar el mouse, enfocar con teclado o tocar, explica para qué sirve la sección.
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  function place() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = 288;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), window.innerWidth - width - 12);
    setPos({ top: r.bottom + 8, left });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label="Más información"
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-foreground-4 align-middle text-[10px] font-bold italic leading-none text-foreground-3 transition-colors hover:border-pink hover:text-pink focus:border-pink focus:text-pink focus:outline-none ${className}`}
      >
        i
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 288 }}
            className="pointer-events-none z-[60] rounded-xl border border-border-strong bg-surface px-3.5 py-3 text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-foreground-2 shadow-xl"
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}
