import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import "../utils/calendarLocale";
import { fromCalendarDateString, toCalendarDateString } from "../utils/eventFilters";
import { formatShortDate } from "../utils/format";
import { color, fontFamily, radius } from "../theme/tokens";

// Un día opcional: muestra la fecha (o el texto vacío) y, al tocar, despliega un calendario.
export function DayField({
  label,
  value,
  onChange,
  emptyText,
  minDay,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  emptyText: string;
  minDay?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.field} onPress={() => setOpen((o) => !o)}>
          <Text style={[styles.value, !value && { color: color.text4 }]}>{value ? formatShortDate(fromCalendarDateString(value).toISOString()) : emptyText}</Text>
        </Pressable>
        {value !== "" && (
          <Pressable
            onPress={() => {
              onChange("");
              setOpen(false);
            }}
            hitSlop={8}
          >
            <Text style={styles.clear}>Quitar</Text>
          </Pressable>
        )}
      </View>
      {open && (
        <View style={styles.calendar}>
          <Calendar
            current={value || minDay || toCalendarDateString(new Date())}
            minDate={minDay}
            onDayPress={(d: { dateString: string }) => {
              onChange(d.dateString);
              setOpen(false);
            }}
            markedDates={value ? { [value]: { selected: true, selectedColor: color.pink } } : {}}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  field: { flex: 1, height: 46, borderRadius: radius.field, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  value: { fontFamily: fontFamily.regular, fontSize: 14, color: color.text },
  clear: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3 },
  calendar: { borderRadius: radius.cardLarge, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
});
