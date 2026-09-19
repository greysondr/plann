import { requireOrganizer } from "@/lib/org/session";
import { loadStaff } from "@/lib/org/data";
import { shortDate } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { RemoveStaff, StaffForm } from "@/components/org/SimpleForms";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { organizer } = await requireOrganizer();
  const staff = await loadStaff(organizer.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Equipo de puerta" subtitle="Personas que validan entradas en tus eventos desde la app, sin ver tus ventas ni tu dinero." />
      <Card>
        <CardHeader title="Agregar persona" subtitle="Debe tener una cuenta en Plann. Le aparece «Modo puerta» en su perfil." />
        <div className="p-5">
          <StaffForm />
        </div>
      </Card>
      <Card>
        <CardHeader title="Tu equipo" />
        {staff.length === 0 ? (
          <EmptyState title="Todavía no has agregado a nadie" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Persona</Th>
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
                  <Td>{shortDate(s.created_at)}</Td>
                  <Td className="text-right">
                    <RemoveStaff id={s.id} />
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
