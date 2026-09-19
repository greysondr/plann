import React from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { GlassCard } from "./GlassCard";
import { color, fontFamily } from "../theme/tokens";
import { formatEventDate } from "../utils/format";
import type { EventItem, TicketRecord } from "../core/types";

const STATUS_LABEL: Record<TicketRecord["status"], string> = {
  valid: "Válido",
  used: "Usado",
  void: "Anulado",
  gifted: "Regalo pendiente",
};

export function TicketCard({ ticket, event, ticketTypeName }: { ticket: TicketRecord; event: EventItem; ticketTypeName: string }) {
  // El QR lleva el mismo código corto que se puede escribir a mano en la
  // puerta (sección 26.3): el servidor (checkin_ticket) lo busca y valida,
  // nunca se confía en una firma armada del lado del cliente.
  const qrValue = ticket.code;
  const isValid = ticket.status === "valid";

  return (
    <GlassCard level="panel" style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{ticketTypeName}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.meta}>{formatEventDate(event.startsAt)}</Text>
        <Text style={styles.meta}>{event.venueName}</Text>
        <View style={[styles.statusPill, isValid ? styles.statusValid : styles.statusUsed]}>
          <Text style={[styles.statusText, isValid ? styles.statusTextValid : styles.statusTextUsed]}>
            {event.status === "cancelled" ? "Evento cancelado" : STATUS_LABEL[ticket.status]}
          </Text>
        </View>
      </View>

      <View style={styles.perforationRow}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      <View style={styles.bottom}>
        {ticket.status === "gifted" ? (
          <Text style={styles.codeHint}>Esta entrada ya no te sirve: quedó reservada para quien invitaste. Si cancelas el regalo, vuelve a ser tuya.</Text>
        ) : (
          <>
            <View style={styles.qrPlate}>
              <QRCode value={qrValue} size={116} color={color.ink} backgroundColor={color.cream} />
            </View>
            <Text style={styles.code}>{ticket.code}</Text>
            <Text style={styles.codeHint}>Si el QR no abre, di este código en la puerta.</Text>
          </>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  top: {
    padding: 18,
    gap: 4,
  },
  eyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    color: color.pink,
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 19,
    color: color.text,
    letterSpacing: -0.3,
  },
  meta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: color.text2,
  },
  statusPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusValid: {
    backgroundColor: color.cream,
  },
  statusUsed: {
    backgroundColor: "rgba(233,65,127,0.18)",
  },
  statusText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  statusTextValid: {
    color: color.ink,
  },
  statusTextUsed: {
    color: color.pink,
  },
  perforationRow: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.bg,
    marginLeft: -10,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.bg,
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    marginHorizontal: 4,
  },
  bottom: {
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  qrPlate: {
    backgroundColor: color.cream,
    padding: 12,
    borderRadius: 14,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 16,
    color: color.text,
    letterSpacing: 2,
  },
  codeHint: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: color.text4,
    textAlign: "center",
  },
});
