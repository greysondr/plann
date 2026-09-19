"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, CalendarDays, Receipt, Wallet, Users, Settings, LogOut, Ticket, GitCompareArrows, FileBarChart, Star } from "lucide-react";
import { signOut } from "@/app/organizador/actions";

const NAV = [
  { href: "/organizador", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizador/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/organizador/ventas", label: "Ventas", icon: Receipt },
  { href: "/organizador/comparar", label: "Comparar eventos", icon: GitCompareArrows },
  { href: "/organizador/resenas", label: "Reseñas", icon: Star },
  { href: "/organizador/cupones", label: "Cupones", icon: Ticket },
  { href: "/organizador/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/organizador/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/organizador/equipo", label: "Equipo de puerta", icon: Users },
  { href: "/organizador/configuracion", label: "Configuración", icon: Settings },
];

export function OrgSidebar({ organizerName, email }: { organizerName: string; email: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/plann-logo.svg" alt="Plann" width={28} height={28} />
        <span className="font-display text-[22px] leading-none text-foreground">plann</span>
        <span className="ml-auto rounded-full bg-pink-soft px-2 py-0.5 text-[10.5px] font-bold text-pink">ORGANIZADOR</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
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
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-[13px] font-bold text-foreground">{organizerName}</p>
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
