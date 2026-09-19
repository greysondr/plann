"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut, Search } from "lucide-react";
import { signOut } from "@/app/organizador/actions";
import { NAV, NAV_GROUPS } from "@/lib/org/nav";
import type { OrgRole } from "@/lib/org/roles";
import { openCommandPalette } from "@/components/org/CommandPalette";

const ROLE_LABEL = { owner: "Dueño", editor: "Editor", finance: "Finanzas" } as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/organizador" || href === "/organizador/eventos/nuevo") return pathname === href;
  if (href === "/organizador/eventos") return pathname.startsWith(href) && !pathname.startsWith("/organizador/eventos/nuevo");
  return pathname.startsWith(href);
}

export function OrgSidebar({ organizerName, email, role, unread = 0, pending = 0 }: { organizerName: string; email: string; role: OrgRole; unread?: number; pending?: number }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));
  const counts = { unread, pending };
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <Image src="/plann-logo.svg" alt="Plann" width={28} height={28} />
        <span className="font-display text-[22px] leading-none text-foreground">plann</span>
        <span className="ml-auto rounded-full bg-pink-soft px-2 py-0.5 text-[10.5px] font-bold text-pink">ORGANIZADOR</span>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-xl border border-border-strong bg-surface-muted px-3 py-2 text-left text-[13px] text-foreground-3 hover:border-pink"
        >
          <Search size={15} />
          <span className="flex-1">Buscar…</span>
          <kbd className="rounded border border-border-strong px-1.5 text-[10.5px] font-bold">⌘K</kbd>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="mt-3 first:mt-1">
              <p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-foreground-4">{group}</p>
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  const count = item.badge ? counts[item.badge] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.hint}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors",
                        active ? "bg-pink-soft text-pink" : "text-foreground-2 hover:bg-surface-muted"
                      )}
                    >
                      <Icon size={17} />
                      {item.label}
                      {count > 0 && <span className="ml-auto rounded-full bg-pink px-1.5 py-0.5 text-[10.5px] font-bold text-white">{count > 9 ? "9+" : count}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-[13px] font-bold text-foreground">{organizerName}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide text-pink">{ROLE_LABEL[role]}</p>
        <p className="truncate text-[12px] text-foreground-3">{email}</p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="flex items-center gap-1.5 text-[12.5px] font-bold text-foreground-3 hover:text-pink">
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
