import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip } from "./Chip";
import { DayField } from "./DayField";
import { PUBLISH_HOURS, type PublishSchedule } from "../core/publishSchedule";
import { color, fontFamily } from "../theme/tokens";

export function PublishScheduleField({ value, onChange }: { value: PublishSchedule; onChange: (v: PublishSchedule) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chips}>
        <Chip label="Publicar ahora" selected={value.mode === "now"} onPress={() => onChange({ ...value, mode: "now" })} />
        <Chip label="Programar" selected={value.mode === "later"} onPress={() => onChange({ ...value, mode: "later" })} />
      </View>
      {value.mode === "later" && (
        <>
          <DayField label="Fecha de publicación" value={value.day} onChange={(day) => onChange({ ...value, day })} emptyText="Elige el día" />
          <View style={styles.chips}>
            {PUBLISH_HOURS.map((h, i) => (
              <Chip key={h.label} label={h.label} selected={value.hourIndex === i} onPress={() => onChange({ ...value, hourIndex: i })} />
            ))}
          </View>
          <Text style={styles.hint}>Queda como borrador y se publica solo a esa hora. Te avisamos cuando salga.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, lineHeight: 18 },
});
