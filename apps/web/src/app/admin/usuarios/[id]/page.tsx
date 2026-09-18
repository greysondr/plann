import { notFound } from "next/navigation";
import { findBuyer, ordersForBuyer } from "@/lib/mock-data";
import { BuyerDetail } from "./BuyerDetail";

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buyer = findBuyer(id);
  if (!buyer) notFound();
  const orders = ordersForBuyer(id)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return <BuyerDetail buyer={buyer} orders={orders} />;
}
