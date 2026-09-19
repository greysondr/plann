"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getOrganizerContext } from "@/lib/org/session";

export interface FormState {
  error?: string;
  ok?: string;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/organizador");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/organizador/login");
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "organizador"
  );
}

// Pedir ser organizador (o reintentar tras un rechazo). Queda en 'pendiente'
// hasta que un admin lo apruebe; las guardas de Postgres impiden que el propio
// usuario se marque como verificado.
export async function applyAsOrganizer(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  if (name.length < 3) return { error: "Escribe el nombre de tu negocio o tu nombre legal." };
  if (document.length < 5) return { error: "Escribe tu cédula o RIF." };

  const ctx = await getOrganizerContext();
  if (!ctx) redirect("/organizador/login");
  const supabase = await supabaseServer();

  if (ctx.organizer) {
    const { error } = await supabase
      .from("organizers")
      .update({ name, legal_document: document, verification_status: "pendiente" })
      .eq("id", ctx.organizer.id);
    if (error) return { error: "No pudimos reenviar tu solicitud. Intenta de nuevo." };
  } else {
    const { error } = await supabase.from("organizers").insert({
      owner_user_id: ctx.user.id,
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
      legal_document: document,
      verification_status: "pendiente",
      plan: "basico",
      commission_rate: 0.12,
    });
    if (error) return { error: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  }
  revalidatePath("/organizador", "layout");
  return { ok: "Solicitud enviada." };
}
