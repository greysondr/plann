"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin/session";

async function audit(action: string, target: string, detail: Record<string, unknown>) {
  const { user } = await requireAdmin();
  await supabaseAdmin().from("audit_log").insert({ actor_id: user.id, actor_label: user.email ?? "Admin", action, target, detail });
}

export async function reviewOrganizer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as "verificado" | "rechazado" | "suspendido";
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "verificado" && reason.length < 5) return;

  const { error } = await supabaseAdmin()
    .from("organizers")
    .update({
      verification_status: decision,
      rejection_reason: decision === "verificado" ? null : reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await audit(`organizer.${decision}`, id, { reason: reason || null });
  revalidatePath("/admin/solicitudes");
}

export async function resolveWithdrawal(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "pagado" | "rechazado";
  const { error } = await supabaseAdmin()
    .from("withdrawals")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: (await requireAdmin()).user.id })
    .eq("id", id)
    .eq("status", "pendiente");
  if (error) throw new Error(error.message);
  await audit(`withdrawal.${status}`, id, {});
  revalidatePath("/admin/solicitudes");
}

export async function markRefunded(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const { error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "refund_pending");
  if (error) throw new Error(error.message);
  await audit("order.refunded", id, {});
  revalidatePath("/admin/solicitudes");
}
