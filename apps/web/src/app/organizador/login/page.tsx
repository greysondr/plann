import Image from "next/image";
import { LoginForm } from "@/components/org/Forms";
import { Card } from "@/components/ui";

export const metadata = { title: "Plann Organizadores" };

export default function OrganizerLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/plann-logo.svg" alt="Plann" width={34} height={34} />
          <span className="font-display text-[28px] leading-none text-foreground">plann</span>
        </div>
        <Card className="p-6">
          <h1 className="text-[20px] font-extrabold tracking-tight text-foreground">Panel de organizadores</h1>
          <p className="mb-5 mt-1 text-[13.5px] text-foreground-3">Entra con la misma cuenta que usas en la app de Plann.</p>
          <LoginForm />
        </Card>
        <p className="mt-4 text-center text-[12.5px] text-foreground-3">
          ¿Todavía no eres organizador? Entra y te guiamos para solicitar tu verificación.
        </p>
      </div>
    </main>
  );
}
