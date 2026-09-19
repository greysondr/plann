import { requireOrganizer } from "@/lib/org/session";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/org/SimpleForms";

const PLAN: Record<string, string> = { basico: "Básico", pro: "Pro", business: "Business" };

export default async function SettingsPage() {
  const { organizer, user } = await requireOrganizer();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Configuración" subtitle="Tu perfil público y los datos donde recibes tus pagos." />
      <Card>
        <CardHeader title="Tu cuenta" />
        <div className="grid gap-4 p-5 text-[13.5px] sm:grid-cols-3">
          <div>
            <p className="text-[12px] font-bold uppercase text-foreground-3">Correo</p>
            <p className="mt-1 font-semibold text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-foreground-3">Plan</p>
            <p className="mt-1 font-semibold text-foreground">{PLAN[organizer.plan]}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-foreground-3">Comisión de Plann</p>
            <p className="mt-1 font-semibold text-foreground">{Math.round(organizer.commission_rate * 100)}% de cada venta</p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-foreground-3">Verificación</p>
            <div className="mt-1">
              <Badge tone="success">Verificado</Badge>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-foreground-3">Cédula o RIF</p>
            <p className="mt-1 font-semibold text-foreground">{organizer.legal_document ?? "—"}</p>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Perfil del negocio" />
        <div className="p-5">
          <ProfileForm organizer={organizer} />
        </div>
      </Card>
    </div>
  );
}
