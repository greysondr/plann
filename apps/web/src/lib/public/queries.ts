import "server-only";
import { supabasePublic } from "@/lib/supabase/public";

export interface PublicTicketType {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  sold: number;
  reserved: number;
  sales_start: string | null;
  sales_end: string | null;
}

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  images: string[];
  starts_at: string;
  status: string;
  venue_name: string | null;
  venue_address: string | null;
  refund_policy: string;
  organizer_id: string | null;
  ticket_types: PublicTicketType[];
  categories: { name: string } | null;
  cities: { name: string } | null;
  organizers: { id: string; name: string; slug: string; logo_url: string | null; verification_status: string; plan: string } | null;
}

const EVENT_SELECT =
  "id, slug, title, description, images, starts_at, status, venue_name, venue_address, refund_policy, organizer_id, ticket_types(id, name, price_cents, quantity, sold, reserved, sales_start, sales_end), categories(name), cities(name), organizers!events_organizer_id_fkey(id, name, slug, logo_url, verification_status, plan)";

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  const { data } = await supabasePublic().from("events").select(EVENT_SELECT).eq("slug", slug).in("status", ["published", "sold_out", "live", "finished"]).maybeSingle();
  return (data as unknown as PublicEvent | null) ?? null;
}

export interface PublicReview {
  id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export async function getEventReviews(eventId: string, limit = 5): Promise<PublicReview[]> {
  const { data } = await supabasePublic().from("reviews").select("id, event_id, rating, comment, author_name, reply, replied_at, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as PublicReview[];
}

export async function getOrganizerReviews(organizerId: string, limit = 6): Promise<PublicReview[]> {
  const { data } = await supabasePublic().from("reviews").select("id, event_id, rating, comment, author_name, reply, replied_at, created_at").eq("organizer_id", organizerId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as PublicReview[];
}

export async function getOrganizerRating(organizerId: string): Promise<{ avg: number; count: number } | null> {
  const { data } = await supabasePublic().from("organizer_ratings").select("rating_avg, rating_count").eq("organizer_id", organizerId).maybeSingle();
  return data ? { avg: Number(data.rating_avg), count: Number(data.rating_count) } : null;
}

export async function getEventRating(eventId: string): Promise<{ avg: number; count: number } | null> {
  const { data } = await supabasePublic().from("event_ratings").select("rating_avg, rating_count").eq("event_id", eventId).maybeSingle();
  return data ? { avg: Number(data.rating_avg), count: Number(data.rating_count) } : null;
}

export async function getFollowers(organizerId: string): Promise<number> {
  const { data } = await supabasePublic().rpc("organizer_followers", { p_organizer_id: organizerId });
  return Number(data ?? 0);
}

export async function getPublicOrganizer(slug: string) {
  const { data } = await supabasePublic()
    .from("organizers")
    .select("id, name, slug, logo_url, cover_url, bio, contact_phone, verification_status, plan, cities(name)")
    .eq("slug", slug)
    .eq("verification_status", "verificado")
    .maybeSingle();
  return data as unknown as { id: string; name: string; slug: string; logo_url: string | null; cover_url: string | null; bio: string | null; contact_phone: string | null; verification_status: string; plan: string; cities: { name: string } | null } | null;
}

export async function getOrganizerEvents(organizerId: string): Promise<PublicEvent[]> {
  const { data } = await supabasePublic().from("events").select(EVENT_SELECT).eq("organizer_id", organizerId).in("status", ["published", "sold_out", "live", "finished"]).order("starts_at", { ascending: false });
  return (data ?? []) as unknown as PublicEvent[];
}

export async function recordLinkVisit(eventId: string, src: string | undefined) {
  await supabasePublic().rpc("record_link_visit", { p_event_id: eventId, p_src: src ?? null });
}
