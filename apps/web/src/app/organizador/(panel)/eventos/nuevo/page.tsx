import { can, requireRole } from "@/lib/org/session";
import { loadCatalog } from "@/lib/org/data";
import { Card, PageHeader } from "@/components/ui";
import { EventForm } from "@/components/org/EventForm";

export default async function NewEventPage() {
  await requireRole(can.manage);
  const { categories, cities } = await loadCatalog();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nuevo evento" subtitle="Se publica al guardar y aparece de inmediato en la app de Plann." />
      <Card className="p-6">
        <EventForm mode="create" categories={categories} cities={cities} />
      </Card>
    </div>
  );
}
