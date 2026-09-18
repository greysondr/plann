"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Banknote,
  Wallet,
  Building2,
  CalendarDays,
  Users,
  FileBarChart,
  ShieldCheck,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { paymentQueue, withdrawals } from "@/lib/mock-data";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pagos", label: "Pagos y conciliación", icon: Banknote, badgeKey: "pagos" as const },
  { href: "/admin/retiros", label: "Retiros", icon: Wallet, badgeKey: "retiros" as const },
  { href: "/admin/organizadores", label: "Organizadores", icon: Building2 },
  { href: "/admin/eventos", label: "Eventos y moderación", icon: CalendarDays },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/soporte", label: "Soporte", icon: LifeBuoy },
  { href: "/admin/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const pendingPagos = paymentQueue().length;
  const pendingRetiros = withdrawals.filter((w) => w.status === "pendiente").length;
  const badges: Record<string, number> = { pagos: pendingPagos, retiros: pendingRetiros };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/plann-logo.svg" alt="Plann" width={28} height={28} />
        <span className="font-display text-[22px] leading-none text-foreground">plann</span>
        <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-foreground-3">ADMIN</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
                active ? "bg-pink-soft text-pink" : "text-foreground-2 hover:bg-surface-muted"
              )}
            >
              <Icon size={17} strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={clsx("rounded-full px-1.5 py-0.5 text-[10.5px] font-bold", active ? "bg-pink text-white" : "bg-foreground text-background")}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-[12px] font-extrabold text-white">GD</div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-foreground">Grey</p>
            <p className="truncate text-[11.5px] text-foreground-3">Superadmin · 2FA activo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
