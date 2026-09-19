import { can, requireRole } from "@/lib/org/session";
import { loadStaff, loadStaffInvites } from "@/lib/org/data";
import { shortDate } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { CancelInvite, RemoveStaff, StaffForm } from "@/components/org/SimpleForms";

export const dynamic = "force-dynamic";

const LIMIT = { basico: 1, pro: 5, business: 50 } as const;
const PLAN = { basico: "Básico", pro: "Pro", business: "Business" } as const;
const ROLE = { door: "Puerta", editor: "Editor", finance: "Finanzas" } as const;

export default async function TeamPage() {
  const { organizer } = await requireRole(can.owner);
  const [staff, invites] = await Promise.all([loadStaff(organizer.id), loadStaffInvites(organizer.id)]);
  const used = staff.length + invites.length;
  const limit = LIMIT[organizer.plan];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Equipo" subtitle="Personas que te ayudan a operar. Cada rol solo ve y hace lo que le corresponde." />

      <Card>
        <CardHeader title="Agregar persona" subtitle={`${used} de ${limit} en tu plan ${PLAN[organizer.plan]}`} />
        <div className="space-y-4 p-5">
          <StaffForm />
          <div className="grid gap-2 border-t border-border pt-4 text-[12.5px] text-foreground-3 sm:grid-cols-3">
            <p>
              <span className="font-bold text-foreground-2">Puerta.</span> Valida entradas desde su teléfono. No ve ventas ni compradores.
            </p>
            <p>
              <span className="font-bold text-foreground-2">Editor.</span> Publica y edita eventos, cupones, cortesías y mensajes. No ve retiros, no cancela ni reembolsa.
            </p>
            <p>
              <span className="font-bold text-foreground-2">Finanzas.</span> Solo lectura de ventas, saldo, retiros y reportes. No edita nada ni retira.
            </p>
          </div>
          <p className="text-[12.5px] text-foreground-3">Si la persona todavía no tiene cuenta en Plann, queda invitada y entra al equipo sola cuando se registre con ese correo.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Tu equipo" />
        {staff.length === 0 && invites.length === 0 ? (
          <EmptyState title="Todavía no has agregado a nadie" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Persona</Th>
                <Th>Rol</Th>
                <Th>Desde</Th>
                <Th className="text-right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="font-semibold text-foreground">{s.full_name || s.email}</div>
                    {s.full_name && <div className="text-[12px] text-foreground-3">{s.email}</div>}
                  </Td>
                  <Td>
                    <Badge tone="pink">{ROLE[s.role]}</Badge>
                  </Td>
                  <Td>{shortDate(s.created_at)}</Td>
                  <Td className="text-right">
                    <RemoveStaff id={s.id} />
                  </Td>
                </Tr>
              ))}
              {invites.map((i) => (
                <Tr key={i.id}>
                  <Td>
                    <div className="font-semibold text-foreground">{i.email}</div>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{ROLE[i.role]}</Badge> <Badge tone="warning">Invitada</Badge>
                  </Td>
                  <Td>{shortDate(i.created_at)}</Td>
                  <Td className="text-right">
                    <CancelInvite id={i.id} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
