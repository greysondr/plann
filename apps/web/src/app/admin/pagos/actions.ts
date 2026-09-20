"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";

// Aprueba o rechaza un pago con la función de Postgres (admin_review_payment):
// al aprobar, la orden pasa a pagada y el disparador emite las entradas.
export async function reviewPaymentAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "approved" && decision !== "rejected") return;
  if (decision === "rejected" && reason.length < 3) return;
  const { error } = await supabase.rpc("admin_review_payment", {
    p_payment_id: id,
    p_decision: decision,
    p_rejection_reason: decision === "rejected" ? reason : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pagos");
}
