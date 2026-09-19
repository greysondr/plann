import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip } from "./Chip";
import { color, fontFamily, radius } from "../theme/tokens";

export { TICKET_NAME_PRESETS, newDraft, draftToTicket, validDrafts, type TicketDraft } from "../utils/ticketDrafts";
import type { TicketDraft } from "../utils/ticketDrafts";
import { TICKET_NAME_PRESETS } from "../utils/ticketDrafts";

export function TicketDraftEditor({
  draft,
  onChange,
  onRemove,
}: {
  draft: TicketDraft;
  onChange: (next: TicketDraft) => void;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.chipsWrap}>
          {TICKET_NAME_PRESETS.map((n) => (
            <Chip key={n} label={n} selected={draft.name === n} onPress={() => onChange({ ...draft, name: n })} />
          ))}
        </View>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={styles.remove}>Quitar</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name })}
        placeholder="Nombre de la entrada"
        placeholderTextColor={color.text4}
        style={styles.input}
      />
      <View style={styles.twoCols}>
        <TextInput
          value={draft.price}
          onChangeText={(price) => onChange({ ...draft, price })}
          placeholder="Precio USD"
          placeholderTextColor={color.text4}
          keyboardType="decimal-pad"
          style={[styles.input, { flex: 1.3 }]}
        />
        <TextInput
          value={draft.quantity}
          onChangeText={(quantity) => onChange({ ...draft, quantity })}
          placeholder="Cupo"
          placeholderTextColor={color.text4}
          keyboardType="number-pad"
          style={[styles.input, { flex: 0.8 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: radius.cardLarge,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  remove: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3 },
  twoCols: { flexDirection: "row", gap: 10 },
  input: {
    height: 46,
    borderRadius: radius.field,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
});
