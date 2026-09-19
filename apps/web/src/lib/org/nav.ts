import { LayoutDashboard, CalendarDays, Receipt, Wallet, Users, Settings, Ticket, GitCompareArrows, FileBarChart, Star, LifeBuoy, Bell, PlusCircle } from "lucide-react";
import type { OrgRole } from "./roles";

export interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
  roles: OrgRole[];
  group: "Gestión" | "Dinero" | "Crecimiento" | "Cuenta";
  keywords: string;
  badge?: "unread" | "pending";
}

const ALL: OrgRole[] = ["owner", "editor", "finance"];
const MANAGE: OrgRole[] = ["owner", "editor"];
const MONEY: OrgRole[] = ["owner", "finance"];

export const NAV: NavItem[] = [
  { href: "/organizador", label: "Dashboard", hint: "Resumen de tus ventas", icon: LayoutDashboard, roles: ALL, group: "Gestión", keywords: "inicio resumen analiticas" },
  { href: "/organizador/eventos/nuevo", label: "Publicar evento", hint: "Crea y vende entradas", icon: PlusCircle, roles: MANAGE, group: "Gestión", keywords: "nuevo crear evento" },
  { href: "/organizador/eventos", label: "Eventos", hint: "Editar, pausar, duplicar, repetir", icon: CalendarDays, roles: ALL, group: "Gestión", keywords: "editar duplicar repetir asistentes cortesia mensaje afiche" },
  { href: "/organizador/ventas", label: "Ventas", hint: "Cada pedido y reembolsos", icon: Receipt, roles: ALL, group: "Gestión", keywords: "pedidos compras reembolso", badge: "pending" },
  { href: "/organizador/finanzas", label: "Finanzas", hint: "Saldo, retiros y liquidación", icon: Wallet, roles: MONEY, group: "Dinero", keywords: "dinero saldo retirar cobrar" },
  { href: "/organizador/reportes", label: "Reportes", hint: "Resumen mensual para contabilidad", icon: FileBarChart, roles: MONEY, group: "Dinero", keywords: "contabilidad mensual descargar" },
  { href: "/organizador/comparar", label: "Comparar eventos", hint: "Cuál vende y convierte mejor", icon: GitCompareArrows, roles: ALL, group: "Crecimiento", keywords: "estadisticas comparar" },
  { href: "/organizador/cupones", label: "Cupones", hint: "Descuentos para compradores", icon: Ticket, roles: MANAGE, group: "Crecimiento", keywords: "descuento codigo promocion" },
  { href: "/organizador/resenas", label: "Reseñas", hint: "Opiniones y seguidores", icon: Star, roles: MANAGE, group: "Crecimiento", keywords: "opiniones calificacion" },
  { href: "/organizador/equipo", label: "Equipo", hint: "Puerta, editores y finanzas", icon: Users, roles: ["owner"], group: "Cuenta", keywords: "personal invitar staff roles" },
  { href: "/organizador/notificaciones", label: "Notificaciones", hint: "Ventas, cupos, retiros", icon: Bell, roles: ALL, group: "Cuenta", keywords: "avisos alertas", badge: "unread" },
  { href: "/organizador/soporte", label: "Ayuda y soporte", hint: "Escribir a Plann", icon: LifeBuoy, roles: ALL, group: "Cuenta", keywords: "ayuda problema contacto" },
  { href: "/organizador/configuracion", label: "Configuración", hint: "Perfil, logo y cuenta de cobro", icon: Settings, roles: ["owner"], group: "Cuenta", keywords: "perfil logo cuenta pago" },
];

export const NAV_GROUPS: NavItem["group"][] = ["Gestión", "Dinero", "Crecimiento", "Cuenta"];

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function matches(query: string, ...fields: string[]): boolean {
  const q = normalize(query.trim());
  return !q || normalize(fields.join(" ")).includes(q);
}
