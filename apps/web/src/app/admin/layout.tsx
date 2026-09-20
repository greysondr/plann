import { Sidebar } from "@/components/Sidebar";
import { requireAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const db = supabaseAdmin();
  const [pagos, retiros] = await Promise.all([
    db.from("payments").select("id", { count: "exact", head: true }).in("status", ["submitted", "matched"]),
    db.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
  ]);
  return (
    <div className="flex min-h-screen items-start">
      <Sidebar email={user.email ?? ""} pagos={pagos.count ?? 0} retiros={retiros.count ?? 0} />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
