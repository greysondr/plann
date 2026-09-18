// Máquina de estados de la orden y del ticket (sección 8.1, 8.2 y 10.1).
// Ninguna pantalla cambia un estado sin pasar por acá.
import type { OrderStatus, TicketStatus } from "./types";

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["in_verification", "expired"],
  in_verification: ["paid", "rejected"],
  rejected: ["pending_payment", "cancelled"],
  paid: [],
  expired: ["cancelled"],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function nextOrderStates(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  valid: ["used", "void"],
  used: [],
  void: [],
};

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from].includes(to);
}

export const ORDER_LOCK_MINUTES = 15;
