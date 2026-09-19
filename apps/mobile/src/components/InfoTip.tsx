import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { getHelp } from "../core/help";
import { color, fontFamily, radius } from "../theme/tokens";

// Signo ⓘ pequeño: al tocarlo explica para qué sirve la sección o el dato.
export function InfoTip({ label, text, size = 16 }: { label?: string; text?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const body = text ?? getHelp(label);
  if (!body) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Más información${label ? `: ${label}` : ""}`}>
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.i, { fontSize: size * 0.62 }]}>i</Text>
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            {label ? <Text style={styles.title}>{label}</Text> : null}
            <Text style={styles.body}>{body}</Text>
            <Pressable style={styles.button} onPress={() => setOpen(false)}>
              <Text style={styles.buttonText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Título de sección con su ⓘ (si hay explicación para ese texto).
export function HelpTitle({ children, style, help }: { children: string; style?: StyleProp<TextStyle>; help?: string }) {
  return (
    <View style={styles.titleRow}>
      <Text style={style}>{children}</Text>
      <InfoTip label={children} text={help} size={15} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1, borderColor: color.text3, alignItems: "center", justifyContent: "center" },
  i: { fontFamily: fontFamily.extraBold, color: color.text3, fontStyle: "italic", includeFontPadding: false },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: "100%", maxWidth: 380, borderRadius: radius.cardLarge, backgroundColor: "#1c1a1f", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", padding: 20, gap: 10 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: color.text2 },
  button: { marginTop: 6, alignSelf: "flex-end", paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: color.pink },
  buttonText: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.white },
});
