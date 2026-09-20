"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin/session";

export async function replyTicketAction(ticketId: string, formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 2000) return;
  const db = supabaseAdmin();
  await db.from("support_messages").insert({ ticket_id: ticketId, author_role: "staff", body });
  await db
    .from("support_tickets")
    .update({ status: "en_proceso", updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
    .eq("id", ticketId)
    .in("status", ["abierto"]);
  await db.from("audit_log").insert({ actor_label: user.email ?? "Admin", actor_id: user.id, action: "support.reply", target: ticketId, detail: {} });
  revalidatePath(`/admin/soporte/${ticketId}`);
  revalidatePath("/admin/soporte");
}

export async function setTicketStatusAction(ticketId: string, status: "abierto" | "en_proceso" | "resuelto" | "cerrado"): Promise<void> {
  const { user } = await requireAdmin();
  const db = supabaseAdmin();
  await db.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
  await db.from("audit_log").insert({ actor_label: user.email ?? "Admin", actor_id: user.id, action: `support.${status}`, target: ticketId, detail: {} });
  revalidatePath(`/admin/soporte/${ticketId}`);
  revalidatePath("/admin/soporte");
}
