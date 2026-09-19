"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, CalendarDays, Receipt, Wallet, Users, Settings, LogOut, Ticket, GitCompareArrows, FileBarChart, Star, LifeBuoy, Bell } from "lucide-react";
import { signOut } from "@/app/organizador/actions";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: ("owner" | "editor" | "finance")[] };

const ALL: ("owner" | "editor" | "finance")[] = ["owner", "editor", "finance"];
const NAV: NavItem[] = [
  { href: "/organizador", label: "Dashboard", icon: LayoutDashboard, roles: ALL },
  { href: "/organizador/eventos", label: "Eventos", icon: CalendarDays, roles: ALL },
  { href: "/organizador/ventas", label: "Ventas", icon: Receipt, roles: ALL },
  { href: "/organizador/comparar", label: "Comparar eventos", icon: GitCompareArrows, roles: ALL },
  { href: "/organizador/resenas", label: "Reseñas", icon: Star, roles: ["owner", "editor"] },
  { href: "/organizador/cupones", label: "Cupones", icon: Ticket, roles: ["owner", "editor"] },
  { href: "/organizador/finanzas", label: "Finanzas", icon: Wallet, roles: ["owner", "finance"] },
  { href: "/organizador/reportes", label: "Reportes", icon: FileBarChart, roles: ["owner", "finance"] },
  { href: "/organizador/equipo", label: "Equipo", icon: Users, roles: ["owner"] },
  { href: "/organizador/notificaciones", label: "Notificaciones", icon: Bell, roles: ALL },
  { href: "/organizador/soporte", label: "Ayuda y soporte", icon: LifeBuoy, roles: ALL },
  { href: "/organizador/configuracion", label: "Configuración", icon: Settings, roles: ["owner"] },
];

const ROLE_LABEL = { owner: "Dueño", editor: "Editor", finance: "Finanzas" } as const;

export function OrgSidebar({ organizerName, email, role, unread = 0 }: { organizerName: string; email: string; role: "owner" | "editor" | "finance"; unread?: number }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/plann-logo.svg" alt="Plann" width={28} height={28} />
        <span className="font-display text-[22px] leading-none text-foreground">plann</span>
        <span className="ml-auto rounded-full bg-pink-soft px-2 py-0.5 text-[10.5px] font-bold text-pink">ORGANIZADOR</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active = item.href === "/organizador" ? pathname === "/organizador" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
                active ? "bg-pink-soft text-pink" : "text-foreground-2 hover:bg-surface-muted"
              )}
            >
              <Icon size={17} />
              {item.label}
              {item.href === "/organizador/notificaciones" && unread > 0 && <span className="ml-auto rounded-full bg-pink px-1.5 py-0.5 text-[10.5px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
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
