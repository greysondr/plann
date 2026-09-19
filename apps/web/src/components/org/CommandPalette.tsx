"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CornerDownLeft } from "lucide-react";
import { NAV, matches } from "@/lib/org/nav";
import type { OrgRole } from "@/lib/org/roles";
import type { EventLink } from "@/lib/org/data";

const OPEN_EVENT = "plann:open-palette";
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Entry = { key: string; href: string; label: string; hint: string; icon: React.ReactNode };

export function CommandPalette({ role, events }: { role: OrgRole; events: EventLink[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const pages = NAV.filter((n) => n.roles.includes(role) && matches(query, n.label, n.hint, n.keywords)).map((n) => {
      const Icon = n.icon;
      return { key: n.href, href: n.href, label: n.label, hint: n.hint, icon: <Icon size={16} /> };
    });
    const evs = events
      .filter((e) => query.trim() !== "" && matches(query, e.title))
      .slice(0, 6)
      .map((e) => ({ key: `e-${e.id}`, href: `/organizador/eventos/${e.id}`, label: e.title, hint: "Evento", icon: <CalendarDays size={16} /> }));
    return [...pages, ...evs];
  }, [query, role, events]);

  if (!open) return null;

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(entry.href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[14vh]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(entries.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(entries[index]);
            }
          }}
          placeholder="Ir a… cupones, retiros, un evento"
          className="w-full border-b border-border bg-transparent px-4 py-3.5 text-[15px] text-foreground outline-none placeholder:text-foreground-4"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {entries.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-foreground-3">No encontramos nada con «{query}».</li>}
          {entries.map((entry, i) => (
            <li key={entry.key}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(entry)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === index ? "bg-pink-soft text-pink" : "text-foreground-2"}`}
              >
                {entry.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{entry.label}</span>
                  <span className="block truncate text-[12px] text-foreground-3">{entry.hint}</span>
                </span>
                {i === index && <CornerDownLeft size={14} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
