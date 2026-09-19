import Image from "next/image";
import { redirect } from "next/navigation";
import { getOrganizerContext } from "@/lib/org/session";
import { signOut } from "@/app/organizador/actions";
import { ApplyForm } from "@/components/org/Forms";
import { OrgSidebar } from "@/components/org/OrgSidebar";
import { countPendingPayments, countUnread, loadEventLinks } from "@/lib/org/data";
import { CommandPalette } from "@/components/org/CommandPalette";
import { Badge, Button, Card } from "@/components/ui";

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/plann-logo.svg" alt="Plann" width={34} height={34} />
          <span className="font-display text-[28px] leading-none text-foreground">plann</span>
        </div>
        <Card className="space-y-4 p-6">{children}</Card>
        <form action={signOut} className="mt-4 text-center">
          <Button type="submit" variant="ghost">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrganizerContext();
  if (!ctx) redirect("/organizador/login");
  const { organizer, user, role } = ctx;

  if (!organizer || !role) {
    return (
      <Gate>
        <h1 className="text-[20px] font-extrabold text-foreground">Conviértete en organizador</h1>
        <p className="text-[13.5px] leading-relaxed text-foreground-3">
          Para publicar eventos y vender entradas necesitamos verificar quién eres. Revisamos tu solicitud en menos de 24 horas.
        </p>
        <ApplyForm label="Solicitar verificación" />
      </Gate>
    );
  }

  if (organizer.verification_status === "pendiente") {
    return (
      <Gate>
        <Badge tone="warning">En revisión</Badge>
        <h1 className="text-[20px] font-extrabold text-foreground">Estamos revisando tu solicitud</h1>
        <p className="text-[13.5px] leading-relaxed text-foreground-3">
          {organizer.name} está en revisión. Normalmente toma menos de 24 horas y cuando esté lista este panel se abre solo.
        </p>
      </Gate>
    );
  }

  if (organizer.verification_status === "rechazado") {
    return (
      <Gate>
        <Badge tone="danger">No aprobada</Badge>
        <h1 className="text-[20px] font-extrabold text-foreground">No pudimos verificarte esta vez</h1>
        <p className="text-[13.5px] leading-relaxed text-foreground-3">
          {organizer.rejection_reason ?? "Revisa tus datos y vuelve a enviarlos."}
        </p>
        <ApplyForm defaultName={organizer.name} defaultDocument={organizer.legal_document ?? ""} label="Enviar de nuevo" />
      </Gate>
    );
  }

  if (organizer.verification_status === "suspendido") {
    return (
      <Gate>
        <Badge tone="danger">Suspendida</Badge>
        <h1 className="text-[20px] font-extrabold text-foreground">Tu cuenta de organizador está suspendida</h1>
        <p className="text-[13.5px] leading-relaxed text-foreground-3">
          No puedes publicar eventos ni retirar saldo por ahora. Escríbenos a soporte@plann.app para revisar tu caso.
        </p>
      </Gate>
    );
  }

  const [unread, pending, eventLinks] = await Promise.all([countUnread(), countPendingPayments(), loadEventLinks(organizer.id)]);
  return (
    <div className="flex min-h-screen items-start">
      <OrgSidebar organizerName={organizer.name} email={user.email ?? ""} role={role} unread={unread} pending={pending} />
      <CommandPalette role={role} events={eventLinks} />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
