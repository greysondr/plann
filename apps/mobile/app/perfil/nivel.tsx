import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { ChevronRight, StarIcon } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { LOYALTY_TIERS } from "../../src/core/loyalty";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

export default function NivelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { points, tier } = useAppStore();

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Puntos Plann</Text>
        <InfoTip label="Mi nivel y puntos" size={18} />
      </View>

      <View style={styles.section}>
        <GlassCard level="panel">
          <View style={{ padding: 20, alignItems: "center" }}>
            <StarIcon size={26} color={color.pink} />
            <Text style={styles.bigPoints}>{points}</Text>
            <Text style={styles.bigPointsLabel}>puntos en los últimos 12 meses</Text>
            <View style={styles.currentTierPill}>
              <Text style={styles.currentTierText}>Eres {tier.name}</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cómo se ganan</Text>
        <Text style={styles.sectionBody}>
          1 punto por cada $1 del precio del ticket (sin el fee de servicio), +50 puntos en tu primera compra. Los
          puntos se usan como descuento en el checkout: 100 puntos = $1.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>La escalera</Text>
        <View style={{ gap: 12, marginTop: 10 }}>
          {LOYALTY_TIERS.map((t) => {
            const isCurrent = t.key === tier.key;
            const unlocked = points >= t.threshold;
            return (
              <GlassCard key={t.key} level={isCurrent ? "panel" : "card"}>
                <View style={[styles.tierRow, isCurrent && styles.tierRowActive]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.tierName}>{t.name}</Text>
                      {isCurrent && <Text style={styles.currentBadge}>Tú estás aquí</Text>}
                    </View>
                    <Text style={styles.tierThreshold}>
                      {t.threshold === 0 ? "Desde el inicio" : `Desde ${t.threshold} puntos`} · fee de servicio{" "}
                      {t.serviceFeeDiscount.toLowerCase()}
                    </Text>
                    <View style={{ marginTop: 8, gap: 3 }}>
                      {t.benefits.map((b) => (
                        <Text key={b} style={[styles.benefit, !unlocked && styles.benefitLocked]}>
                          · {b}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: color.text,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 22,
  },
  bigPoints: {
    fontFamily: fontFamily.extraBold,
    fontSize: 44,
    color: color.text,
    marginTop: 8,
  },
  bigPointsLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
  },
  currentTierPill: {
    marginTop: 14,
    backgroundColor: color.pink,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentTierText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: color.white,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: color.text2,
  },
  tierRow: {
    padding: 16,
  },
  tierRowActive: {
    borderRadius: radius.cardLarge,
  },
  tierName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
  },
  currentBadge: {
    fontFamily: fontFamily.extraBold,
    fontSize: 9.5,
    color: color.pink,
    borderWidth: 1,
    borderColor: color.pink,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tierThreshold: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
    marginTop: 3,
  },
  benefit: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: color.text2,
  },
  benefitLocked: {
    color: color.text4,
  },
});
