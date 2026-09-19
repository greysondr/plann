import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import "../../../src/utils/calendarLocale";
import { GlassCard } from "../../../src/components/GlassCard";
import { Chip } from "../../../src/components/Chip";
import { PrimaryButton } from "../../../src/components/Button";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore, useEvent } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { formatEventDate, formatShortDate } from "../../../src/utils/format";
import { fromCalendarDateString, toCalendarDateString } from "../../../src/utils/eventFilters";
import { EventPhotosField } from "../../../src/components/EventPhotosField";
import { PublishScheduleField } from "../../../src/components/PublishScheduleField";
import { isoToSchedule, scheduleToIso, type PublishSchedule } from "../../../src/core/publishSchedule";
import { LocationPicker, type LatLng } from "../../../src/components/LocationPicker";
import { DayField } from "../../../src/components/DayField";
import { dayEndIso, dayStartIso, isoToVeDay } from "../../../src/core/ticketSales";
import { TicketDraftEditor, draftToTicket, newDraft, type TicketDraft } from "../../../src/components/TicketTypesForm";
import type { TicketType } from "../../../src/core/types";
import { color, fontFamily, radius, spacing } from "../../../src/theme/tokens";

const TIME_SLOTS = [
  { label: "10:00 a.m.", hour: 10, minute: 0 },
  { label: "3:00 p.m.", hour: 15, minute: 0 },
  { label: "8:00 p.m.", hour: 20, minute: 0 },
  { label: "10:00 p.m.", hour: 22, minute: 0 },
];

type Message = { text: string; error: boolean } | null;

function TicketTypeEditor({ ticketType }: { ticketType: TicketType }) {
  const { updateTicketType, deleteTicketType } = useAppStore();
  const [name, setName] = useState(ticketType.name);
  const [price, setPrice] = useState((ticketType.priceCents / 100).toString());
  const [quantity, setQuantity] = useState(String(ticketType.quantity));
  const [startDay, setStartDay] = useState(ticketType.salesStart ? isoToVeDay(ticketType.salesStart) : "");
  const [endDay, setEndDay] = useState(ticketType.salesEnd ? isoToVeDay(ticketType.salesEnd) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
  const quantityNum = parseInt(quantity, 10);
  const valid =
    name.trim().length >= 2 &&
    Number.isFinite(priceCents) &&
    priceCents >= 0 &&
    Number.isInteger(quantityNum) &&
    quantityNum >= ticketType.sold + ticketType.reserved &&
    !(startDay && endDay && endDay < startDay);
  const startIso = startDay ? dayStartIso(startDay) : null;
  const endIso = endDay ? dayEndIso(endDay) : null;
  const changed =
    name.trim() !== ticketType.name ||
    priceCents !== ticketType.priceCents ||
    quantityNum !== ticketType.quantity ||
    (startIso ?? null) !== (ticketType.salesStart ?? null) ||
    (endIso ?? null) !== (ticketType.salesEnd ?? null);
  const canDelete = ticketType.sold === 0 && ticketType.reserved === 0;

  async function remove() {
    setMessage(null);
    const result = await deleteTicketType(ticketType.id);
    if (!result.ok) setMessage({ text: result.reason ?? "No se pudo eliminar.", error: true });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updateTicketType(ticketType.id, name.trim(), priceCents, quantityNum, { salesStart: startIso, salesEnd: endIso });
    setSaving(false);
    setMessage(result.ok ? { text: "Entrada actualizada.", error: false } : { text: result.reason ?? "No se pudo guardar.", error: true });
  }

  return (
    <GlassCard level="card">
      <View style={{ padding: 14, gap: 10 }}>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nombre de la entrada" placeholderTextColor={color.text4} />
        <Text style={styles.hint}>
          {ticketType.sold} vendidas{ticketType.reserved > 0 ? ` · ${ticketType.reserved} reservadas` : ""}
        </Text>
        <View style={styles.twoCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Precio USD</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} placeholderTextColor={color.text4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Cupo total</Text>
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.input} placeholderTextColor={color.text4} />
          </View>
        </View>
        <DayField label="Venta desde" value={startDay} onChange={setStartDay} emptyText="Abierta desde ya" />
        <DayField label="Venta hasta" value={endDay} onChange={setEndDay} emptyText="Hasta agotar" minDay={startDay || undefined} />
        {!valid && quantityNum < ticketType.sold + ticketType.reserved && (
          <Text style={styles.messageError}>El cupo no puede ser menor a {ticketType.sold + ticketType.reserved}, lo que ya se vendió o está reservado.</Text>
        )}
        {message && <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>}
        <PrimaryButton label="Guardar entrada" disabled={!valid || !changed} loading={saving} onPress={save} />
        <Pressable onPress={remove} disabled={!canDelete} style={{ alignSelf: "center", opacity: canDelete ? 1 : 0.4 }}>
          <Text style={styles.hint}>{canDelete ? "Eliminar esta entrada" : "Ya tiene ventas: no se puede eliminar"}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

function NewTicketTypeForm({ eventId }: { eventId: string }) {
  const { addTicketType } = useAppStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TicketDraft>(() => newDraft("VIP"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const ticket = draftToTicket(draft);

  if (!open) {
    return (
      <Pressable style={styles.outlineButton} onPress={() => setOpen(true)}>
        <Text style={styles.outlineButtonText}>Agregar otro tipo de entrada</Text>
      </Pressable>
    );
  }

  async function save() {
    if (!ticket) return;
    setSaving(true);
    setMessage(null);
    const result = await addTicketType(eventId, ticket);
    setSaving(false);
    if (result.ok) {
      setOpen(false);
      setDraft(newDraft("Preventa"));
    } else {
      setMessage({ text: result.reason ?? "No se pudo agregar.", error: true });
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <TicketDraftEditor draft={draft} onChange={setDraft} />
      {message && <Text style={styles.messageError}>{message.text}</Text>}
      <PrimaryButton label="Agregar entrada" disabled={!ticket} loading={saving} onPress={save} />
      <Pressable onPress={() => setOpen(false)} style={{ alignSelf: "center" }}>
        <Text style={styles.hint}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

export default function EditarEventoScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useEvent(id);
  const { updateEvent, publishEvent, setSalesPaused, cancelEvent, organizerOrders, categories, cities } = useAppStore();

  const original = event ? new Date(event.startsAt) : null;
  const originalSlot = original ? TIME_SLOTS.findIndex((s) => s.hour === original.getHours() && s.minute === original.getMinutes()) : -1;

  const [title, setTitle] = useState(event?.title ?? "");
  const [venueName, setVenueName] = useState(event?.venueName ?? "");
  const [venueAddress, setVenueAddress] = useState(event?.meetingPoint ?? "");
  const [point, setPoint] = useState<LatLng | null>(event ? { lat: event.lat, lng: event.lng } : null);
  const [category, setCategory] = useState<string | undefined>(event?.category);
  const [city, setCity] = useState<string | undefined>(event?.city);
  const [photos, setPhotos] = useState<string[]>(event?.images ?? (event?.imageUrl ? [event.imageUrl] : []));
  const [schedule, setSchedule] = useState<PublishSchedule>(isoToSchedule(event?.publishAt));
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState<string | null>(original ? toCalendarDateString(original) : null);
  const [slotIndex, setSlotIndex] = useState<number | null>(originalSlot >= 0 ? originalSlot : null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [salesMessage, setSalesMessage] = useState<Message>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<Message>(null);

  if (!allowed) return null;
  if (!event || !original) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.hint}>No encontramos este evento.</Text>
      </View>
    );
  }

  const cancelled = event.status === "cancelled";
  const paidOrdersCount = organizerOrders.filter((o) => o.eventId === event.id && o.status === "paid").length;

  async function saveDetails() {
    if (!date || !original) return;
    const startsAt = fromCalendarDateString(date);
    if (slotIndex !== null) startsAt.setHours(TIME_SLOTS[slotIndex].hour, TIME_SLOTS[slotIndex].minute, 0, 0);
    else startsAt.setHours(original.getHours(), original.getMinutes(), 0, 0);

    setSaving(true);
    setMessage(null);
    const result = await updateEvent(event!.id, {
      title: title.trim(),
      description: description.trim(),
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      lat: point?.lat,
      lng: point?.lng,
      category,
      city,
      startsAt: startsAt.toISOString(),
      images: photos,
      publishAt: event!.status === "draft" ? scheduleToIso(schedule) ?? null : undefined,
    });
    setSaving(false);
    setMessage(result.ok ? { text: "Cambios guardados.", error: false } : { text: result.reason ?? "No se pudo guardar.", error: true });
  }

  async function toggleSales() {
    setSalesMessage(null);
    const result = await setSalesPaused(event!.id, !event!.salesPaused);
    if (!result.ok) setSalesMessage({ text: result.reason ?? "No se pudo cambiar.", error: true });
  }

  async function confirmCancel() {
    setCancelling(true);
    setCancelMessage(null);
    const result = await cancelEvent(event!.id, reason);
    setCancelling(false);
    if (!result.ok) setCancelMessage({ text: result.reason ?? "No se pudo cancelar.", error: true });
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Editar evento</Text>
        <View style={{ width: 18 }} />
      </View>

      {cancelled ? (
        <View style={styles.section}>
          <GlassCard level="card">
            <View style={{ padding: 16, gap: 6 }}>
              <Text style={styles.ticketName}>Este evento fue cancelado</Text>
              <Text style={styles.hint}>Motivo: {event.cancelReason ?? "sin especificar"}</Text>
              <Text style={styles.hint}>Los pagos confirmados quedaron marcados para reembolso y ya no cuentan en tu saldo.</Text>
            </View>
          </GlassCard>
        </View>
      ) : (
        <>
          {event.status === "draft" && (
            <View style={styles.section}>
              <GlassCard level="card">
                <View style={{ padding: 14, gap: 10 }}>
                  <Text style={styles.ticketName}>Borrador</Text>
                  <Text style={styles.hint}>Este evento todavía no es visible en la app. Publícalo ahora o prográmalo.</Text>
                  <PublishScheduleField value={schedule} onChange={setSchedule} />
                  <Text style={styles.hint}>Para programar, elige la fecha y toca «Guardar cambios» más abajo.</Text>
                  <PrimaryButton label="Publicar ahora" onPress={() => publishEvent(event.id)} />
                </View>
              </GlassCard>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.eventName}>{event.title}</Text>
            <Text style={styles.hint}>{formatEventDate(event.startsAt)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles</Text>
            <Text style={styles.smallLabel}>Fotos</Text>
            <EventPhotosField photos={photos} onChange={setPhotos} />
            <Text style={[styles.smallLabel, { marginTop: 14 }]}>Nombre</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={color.text4} />
            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Categoría</Text>
            <View style={styles.chipsWrap}>
              {categories.filter((c) => c !== "Todos").map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Ciudad</Text>
            <View style={styles.chipsWrap}>
              {cities.map((c) => (
                <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
              ))}
            </View>
            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Lugar</Text>
            <TextInput value={venueName} onChangeText={setVenueName} style={styles.input} placeholderTextColor={color.text4} />
            <TextInput
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="Dirección o punto de referencia (opcional)"
              placeholderTextColor={color.text4}
              style={[styles.input, { marginTop: 10 }]}
            />
            <View style={{ marginTop: 12 }}>
              <LocationPicker value={point} onChange={setPoint} />
            </View>
            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Descripción</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, styles.textArea]}
              placeholderTextColor={color.text4}
            />

            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Fecha</Text>
            <View style={styles.calendarCard}>
              <Calendar
                current={date ?? toCalendarDateString(new Date())}
                minDate={toCalendarDateString(new Date())}
                onDayPress={(day: { dateString: string }) => setDate(day.dateString)}
                markedDates={date ? { [date]: { selected: true, selectedColor: color.pink } } : {}}
                firstDay={1}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: color.text3,
                  dayTextColor: color.text,
                  todayTextColor: color.pink,
                  monthTextColor: color.text,
                  textDisabledColor: color.text4,
                  arrowColor: color.pink,
                  selectedDayBackgroundColor: color.pink,
                  selectedDayTextColor: color.white,
                  textDayFontFamily: fontFamily.semiBold,
                  textMonthFontFamily: fontFamily.extraBold,
                  textDayHeaderFontFamily: fontFamily.bold,
                }}
                style={{ backgroundColor: "transparent" }}
              />
            </View>
            {date && <Text style={styles.hint}>{formatShortDate(fromCalendarDateString(date).toISOString())}</Text>}

            <Text style={[styles.smallLabel, { marginTop: 12 }]}>Hora</Text>
            <View style={styles.chipsWrap}>
              {TIME_SLOTS.map((slot, idx) => (
                <Chip key={slot.label} label={slot.label} selected={slotIndex === idx} onPress={() => setSlotIndex(idx)} />
              ))}
            </View>
            {slotIndex === null && <Text style={styles.hint}>Se mantiene la hora actual del evento.</Text>}

            {message && <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>}
            <PrimaryButton
              label="Guardar cambios"
              disabled={title.trim().length < 3 || !date}
              loading={saving}
              onPress={saveDetails}
              style={{ marginTop: 14 }}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entradas</Text>
            <View style={{ gap: 12 }}>
              {event.ticketTypes.map((tt) => (
                <TicketTypeEditor key={tt.id} ticketType={tt} />
              ))}
              <NewTicketTypeForm eventId={event.id} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ofertas y comunidad</Text>
            <GlassCard level="card">
              <Pressable style={{ padding: 16 }} onPress={() => router.push(`/organizador/ofertas/${event.id}`)}>
                <Text style={{ fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text }}>Oferta de última hora y evento comunitario</Text>
                <Text style={{ fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 3 }}>Llena cupos de último momento y destaca eventos de la comunidad.</Text>
              </Pressable>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ventas</Text>
            <GlassCard level="card">
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={styles.ticketName}>{event.salesPaused ? "Las ventas están pausadas" : "Las ventas están abiertas"}</Text>
                <Text style={styles.hint}>
                  {event.salesPaused
                    ? "Tu evento se sigue viendo, pero nadie puede comprar hasta que las reanudes."
                    : "Pausa las ventas si necesitas frenar la compra sin cancelar el evento."}
                </Text>
                {salesMessage && <Text style={styles.messageError}>{salesMessage.text}</Text>}
                <Pressable style={styles.outlineButton} onPress={toggleSales}>
                  <Text style={styles.outlineButtonText}>{event.salesPaused ? "Reanudar ventas" : "Pausar ventas"}</Text>
                </Pressable>
              </View>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancelar evento</Text>
            <GlassCard level="card">
              <View style={{ padding: 14, gap: 10 }}>
                {!confirmingCancel ? (
                  <>
                    <Text style={styles.hint}>
                      Si lo cancelas, se cierra la venta, se anulan los tickets y los pagos confirmados quedan por reembolsar. No se puede deshacer.
                    </Text>
                    <Pressable style={styles.outlineButton} onPress={() => setConfirmingCancel(true)}>
                      <Text style={styles.outlineButtonText}>Cancelar este evento</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.ticketName}>
                      {paidOrdersCount > 0
                        ? `Vas a reembolsar ${paidOrdersCount} ${paidOrdersCount === 1 ? "compra" : "compras"}`
                        : "Nadie ha comprado todavía"}
                    </Text>
                    <Text style={styles.smallLabel}>Motivo que verán tus compradores</Text>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Ej. Lluvia fuerte en la zona"
                      placeholderTextColor={color.text4}
                      style={styles.input}
                    />
                    {cancelMessage && <Text style={styles.messageError}>{cancelMessage.text}</Text>}
                    <PrimaryButton
                      label="Sí, cancelar evento"
                      disabled={reason.trim().length < 5}
                      loading={cancelling}
                      onPress={confirmCancel}
                    />
                    <Pressable style={styles.outlineButton} onPress={() => setConfirmingCancel(false)}>
                      <Text style={styles.outlineButtonText}>Mejor no</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </GlassCard>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center" },
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 26 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  eventName: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  ticketName: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  smallLabel: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text2, marginBottom: 6 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, lineHeight: 18, marginTop: 4 },
  input: {
    height: 50,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  textArea: { height: 100, paddingTop: 14, textAlignVertical: "top" },
  twoCols: { flexDirection: "row", gap: 10 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  calendarCard: {
    borderRadius: radius.cardLarge,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
  messageError: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink, marginTop: 4 },
  outlineButton: {
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
});
