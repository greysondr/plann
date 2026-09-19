export type OrgRole = "owner" | "editor" | "finance";

export interface OrgTool {
  id: string;
  label: string;
  hint: string;
  route: string;
  group: "Eventos" | "Ventas y dinero" | "Crecimiento" | "Equipo y cuenta";
  roles: OrgRole[];
  keywords: string;
  quick?: boolean; // aparece en el resumen
}

const ALL: OrgRole[] = ["owner", "editor", "finance"];
const MANAGE: OrgRole[] = ["owner", "editor"];
const MONEY: OrgRole[] = ["owner", "finance"];

// Única fuente de verdad de las herramientas: el resumen y el menú "Más" salen de aquí.
export const ORG_TOOLS: OrgTool[] = [
  { id: "crear", label: "Publicar evento", hint: "Crea y vende entradas", route: "/organizador/crear", group: "Eventos", roles: MANAGE, keywords: "nuevo crear evento entradas", quick: true },
  { id: "escanear", label: "Escanear entradas", hint: "Valida los QR en la puerta", route: "/organizador/escanear", group: "Eventos", roles: MANAGE, keywords: "puerta qr validar check-in ingreso", quick: true },
  { id: "eventos", label: "Mis eventos", hint: "Editar, pausar, duplicar, repetir", route: "/organizador/eventos", group: "Eventos", roles: ALL, keywords: "editar duplicar repetir compartir asistentes mensaje cortesia" },
  { id: "ventas", label: "Ventas y pedidos", hint: "Filtra y consulta cada pedido", route: "/organizador/ventas", group: "Ventas y dinero", roles: ALL, keywords: "pedidos compras reembolso", quick: true },
  { id: "retiros", label: "Retiros y saldo", hint: "Tu dinero disponible y por liberar", route: "/organizador/retiros", group: "Ventas y dinero", roles: MONEY, keywords: "dinero saldo cobrar retirar finanzas", quick: true },
  { id: "reportes", label: "Reportes", hint: "Resumen mensual para contabilidad", route: "/organizador/reportes", group: "Ventas y dinero", roles: MONEY, keywords: "contabilidad mensual descargar" },
  { id: "comparar", label: "Comparar eventos", hint: "Cuál vende y convierte mejor", route: "/organizador/comparar", group: "Crecimiento", roles: ALL, keywords: "analiticas estadisticas comparar" },
  { id: "cupones", label: "Cupones", hint: "Descuentos para tus compradores", route: "/organizador/cupones", group: "Crecimiento", roles: MANAGE, keywords: "descuento codigo promocion", quick: true },
  { id: "resenas", label: "Reseñas", hint: "Lo que dicen tus asistentes", route: "/organizador/resenas", group: "Crecimiento", roles: MANAGE, keywords: "opiniones calificacion seguidores" },
  { id: "equipo", label: "Equipo y roles", hint: "Puerta, editores y finanzas", route: "/organizador/equipo", group: "Equipo y cuenta", roles: ["owner"], keywords: "personal invitar staff", quick: true },
  { id: "negocio", label: "Mi negocio", hint: "Perfil, logo y cuenta de cobro", route: "/organizador/negocio", group: "Equipo y cuenta", roles: ["owner"], keywords: "perfil logo cuenta pago configuracion" },
  { id: "notificaciones", label: "Notificaciones", hint: "Ventas, cupos, retiros y más", route: "/notificaciones", group: "Equipo y cuenta", roles: ALL, keywords: "avisos alertas" },
  { id: "soporte", label: "Ayuda y soporte", hint: "Preguntas y escribir a Plann", route: "/soporte", group: "Equipo y cuenta", roles: ALL, keywords: "ayuda problema contacto" },
];

const GROUP_ORDER: OrgTool["group"][] = ["Eventos", "Ventas y dinero", "Crecimiento", "Equipo y cuenta"];

export function toolsFor(role: OrgRole | null): OrgTool[] {
  return role ? ORG_TOOLS.filter((t) => t.roles.includes(role)) : [];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function searchTools(tools: OrgTool[], query: string): OrgTool[] {
  const q = normalize(query.trim());
  if (!q) return tools;
  return tools.filter((t) => normalize(`${t.label} ${t.hint} ${t.keywords}`).includes(q));
}

export function groupTools(tools: OrgTool[]): { group: OrgTool["group"]; tools: OrgTool[] }[] {
  return GROUP_ORDER.map((group) => ({ group, tools: tools.filter((t) => t.group === group) })).filter((g) => g.tools.length > 0);
}
