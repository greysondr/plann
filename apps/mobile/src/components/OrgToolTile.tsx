import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "./GlassCard";
import { InfoTip } from "./InfoTip";
import { color, fontFamily } from "../theme/tokens";
import type { OrgTool } from "../core/orgTools";

export function OrgToolTile({ tool, badge, onPress }: { tool: OrgTool; badge?: number; onPress: () => void }) {
  return (
    <GlassCard level="card" style={styles.card}>
      <Pressable style={styles.inner} onPress={onPress} accessibilityRole="button" accessibilityLabel={tool.label}>
        <View style={styles.top}>
          <Text style={styles.label} numberOfLines={1}>
            {tool.label}
          </Text>
          <InfoTip label={tool.label} size={15} />
          {!!badge && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.hint} numberOfLines={2}>
          {tool.hint}
        </Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: "48%", flexGrow: 1 },
  inner: { padding: 14, gap: 4, minHeight: 78, justifyContent: "center" },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { flex: 1, fontFamily: fontFamily.extraBold, fontSize: 14, color: color.text },
  hint: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16, color: color.text3 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.pink, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontFamily: fontFamily.extraBold, fontSize: 11, color: color.white },
});
