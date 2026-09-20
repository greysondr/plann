import Image from "next/image";
import { AdminLoginForm } from "./AdminLoginForm";
import { Card } from "@/components/ui";

export const metadata = { title: "Plann Admin" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/plann-logo.svg" alt="Plann" width={34} height={34} />
          <span className="font-display text-[28px] leading-none text-foreground">plann</span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-foreground-3">ADMIN</span>
        </div>
        <Card className="p-6">
          <h1 className="text-[20px] font-extrabold tracking-tight text-foreground">Administración</h1>
          <p className="mb-5 mt-1 text-[13.5px] text-foreground-3">Solo para el equipo de Plann.</p>
          {error === "no_admin" && <p className="mb-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">Esa cuenta no tiene acceso de administrador.</p>}
          <AdminLoginForm />
        </Card>
      </div>
    </main>
  );
}
