import type { NewTicketInput } from "../context/AppStore";

export interface TicketDraft {
  key: string;
  name: string;
  price: string; // USD; vacío o 0 = gratis
  quantity: string;
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
  return { name, priceCents, quantity };
}

export function validDrafts(drafts: TicketDraft[]): NewTicketInput[] | null {
  if (drafts.length === 0) return null;
  const tickets = drafts.map(draftToTicket);
  if (tickets.some((t) => t === null)) return null;
  const names = tickets.map((t) => t!.name.toLowerCase());
  if (new Set(names).size !== names.length) return null;
  return tickets as NewTicketInput[];
}
