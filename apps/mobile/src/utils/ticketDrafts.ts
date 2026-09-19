import type { NewTicketInput } from "../context/AppStore";
import { dayEndIso, dayStartIso } from "../core/ticketSales";

export interface TicketDraft {
  key: string;
  name: string;
  price: string; // USD; vacío o 0 = gratis
  quantity: string;
  startDay?: string; // YYYY-MM-DD, vacío = abierta ya
  endDay?: string; // YYYY-MM-DD, vacío = sin cierre
}

export const TICKET_NAME_PRESETS = ["General", "VIP", "Preventa"];

let draftCounter = 0;
export function newDraft(name = "General"): TicketDraft {
  draftCounter += 1;
  return { key: `draft-${draftCounter}`, name, price: "", quantity: "" };
}

export function draftToTicket(d: TicketDraft): NewTicketInput | null {
  const name = d.name.trim();
  const priceCents = d.price.trim() === "" ? 0 : Math.round(parseFloat(d.price.replace(",", ".")) * 100);
  const quantity = parseInt(d.quantity, 10);
  if (name.length < 2 || !Number.isFinite(priceCents) || priceCents < 0) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (d.startDay && d.endDay && d.endDay < d.startDay) return null;
  return {
    name,
    priceCents,
    quantity,
    salesStart: d.startDay ? dayStartIso(d.startDay) : null,
    salesEnd: d.endDay ? dayEndIso(d.endDay) : null,
  };
}

export function validDrafts(drafts: TicketDraft[]): NewTicketInput[] | null {
  if (drafts.length === 0) return null;
  const tickets = drafts.map(draftToTicket);
  if (tickets.some((t) => t === null)) return null;
  const names = tickets.map((t) => t!.name.toLowerCase());
  if (new Set(names).size !== names.length) return null;
  return tickets as NewTicketInput[];
}
