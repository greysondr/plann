import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const STEPS = [
  "Nombre legal o razón social",
  "Cédula o RIF",
  "Foto de la cédula y selfie",
  "Datos de cobro para tus liquidaciones",
];

export default function ActivarOrganizadorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organizerStatus, organizerProfile, requestOrganizerVerification } = useAppStore();
  const [name, setName] = useState(organizerProfile?.name ?? "");
  const [document, setDocument] = useState(organizerProfile?.document ?? "");

  useEffect(() => {
    if (organizerStatus === "verified") {
      router.replace("/organizador");
    }
  }, [organizerStatus, router]);

  const canSubmit = name.trim().length > 2 && document.trim().length > 4;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Modo organizador</Text>
        <View style={{ width: 18 }} />
      </View>

      {organizerStatus === "pending" ? (
        <View style={styles.pendingBox}>
          <ActivityIndicator color={color.pink} size="large" />
          <Text style={styles.pendingTitle}>Estamos revisando tu solicitud</Text>
          <Text style={styles.pendingSubtitle}>
            Normalmente toma menos de 24 h. Te avisamos por correo apenas quede lista.
          </Text>
        </View>
      ) : organizerStatus === "suspended" ? (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingTitle}>Tu cuenta de organizador está suspendida</Text>
          <Text style={styles.pendingSubtitle}>
            No puedes publicar eventos ni retirar saldo por ahora. Escríbenos a soporte@plann.app para revisar tu caso.
          </Text>
        </View>
      ) : (
        <>
          {organizerStatus === "rejected" && (
            <View style={styles.section}>
              <GlassCard level="card">
                <View style={{ padding: 16, gap: 6 }}>
                  <Text style={styles.sectionTitle}>No pudimos verificarte esta vez</Text>
                  <Text style={styles.intro}>
                    {organizerProfile?.rejectionReason ?? "Revisa tus datos y vuelve a enviarlos."}
                  </Text>
                </View>
              </GlassCard>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.intro}>
              Para publicar eventos de pago necesitamos verificar quién eres. Los eventos gratis se pueden publicar
              sin este paso, pero pasan por moderación.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qué vamos a pedirte</Text>
            <GlassCard level="card">
              {STEPS.map((step, idx) => (
                <View key={step}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                  {idx < STEPS.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Empecemos con lo básico</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre legal o razón social"
                placeholderTextColor={color.text4}
                style={styles.input}
              />
              <TextInput
                value={document}
                onChangeText={setDocument}
                placeholder="Cédula o RIF"
                placeholderTextColor={color.text4}
                style={styles.input}
              />
              <Text style={styles.hint}>
                En la app real aquí subirías la foto de tu cédula y una selfie. En este prototipo basta con estos
                datos.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <PrimaryButton
              label={organizerStatus === "rejected" ? "Enviar de nuevo" : "Solicitar verificación"}
              disabled={!canSubmit}
              onPress={() => requestOrganizerVerification(name.trim(), document.trim())}
            />
          </View>
        </>
      )}
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
    fontSize: 17,
    color: color.text,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 22,
  },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: color.text2,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(233,65,127,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    color: color.pink,
  },
  stepText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13.5,
    color: color.text2,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 52,
  },
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
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: color.text4,
    lineHeight: 17,
  },
  pendingBox: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 30,
    gap: 10,
  },
  pendingTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
    textAlign: "center",
  },
  pendingSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: color.text3,
    textAlign: "center",
  },
});
