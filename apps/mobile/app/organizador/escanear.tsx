import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "../../src/components/icons";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore, useEvent } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

type Result = { status: "valid" | "used" | "invalid"; name?: string; time?: string } | null;

export default function EscanearScreen() {
  const allowed = useOrganizerGuard();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(eventId);
  const { tickets, checkIn } = useAppStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<Result>(null);
  const scanLock = useRef(false);

  const relevantTickets = useMemo(
    () => (eventId ? tickets.filter((t) => t.eventId === eventId) : tickets),
    [tickets, eventId]
  );
  const checkedIn = relevantTickets.filter((t) => t.status === "used").length;

  if (!allowed) return null;

  async function applyResult(code: string) {
    const outcome = await checkIn(code, eventId);
    if (outcome.status === "invalid") {
      setResult({ status: "invalid" });
      return;
    }
    setResult({
      status: outcome.status,
      name: outcome.attendeeName,
      time: outcome.checkedInAt ? new Date(outcome.checkedInAt).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : undefined,
    });
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanLock.current) return;
    scanLock.current = true;
    applyResult(data);
    setTimeout(() => {
      scanLock.current = false;
    }, 2500);
  }

  function handleManualVerify() {
    if (!manualCode.trim()) return;
    applyResult(manualCode.trim());
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.title}>{event ? event.title : "Escanear"}</Text>
          <Text style={styles.counter}>
            {checkedIn} / {relevantTickets.length} dentro
          </Text>
        </View>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Necesitamos la cámara para escanear el QR en la puerta.</Text>
            <PrimaryButton label="Activar cámara" onPress={requestPermission} style={{ marginTop: 14 }} />
          </View>
        )}
        <View style={styles.frame} pointerEvents="none" />
      </View>

      <View style={styles.manualBox}>
        <Text style={styles.manualLabel}>Buscar por nombre o código si el QR no abre</Text>
        <View style={styles.manualRow}>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="PLN-XXXXXX"
            placeholderTextColor={color.text4}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            smartInsertDelete={false}
            {...(Platform.OS === "ios" ? { smartQuotesType: "no", smartDashesType: "no" } : null)}
            style={styles.manualInput}
          />
          <PrimaryButton label="Verificar" onPress={handleManualVerify} style={{ minHeight: 46, paddingHorizontal: 18 }} />
        </View>
      </View>

      {result && (
        <Pressable style={styles.resultOverlay} onPress={() => setResult(null)}>
          <View style={[styles.resultCard, result.status === "valid" ? styles.resultValid : styles.resultAlert]}>
            <Text style={[styles.resultTitle, result.status === "valid" ? styles.resultTitleValid : styles.resultTitleAlert]}>
              {result.status === "valid" ? "Válido" : result.status === "used" ? "Ya usado" : "Inválido"}
            </Text>
            {result.name && (
              <Text style={[styles.resultName, result.status === "valid" ? styles.resultTitleValid : styles.resultTitleAlert]}>
                {result.name}
              </Text>
            )}
            {result.status === "used" && result.time && (
              <Text style={styles.resultTime}>Usado a las {result.time}</Text>
            )}
            <Text style={styles.resultHint}>Toca para continuar</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text,
    maxWidth: 220,
  },
  counter: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: color.text3,
  },
  cameraWrap: {
    height: 340,
    marginHorizontal: spacing.screenX,
    borderRadius: radius.cardLarge,
    overflow: "hidden",
    backgroundColor: color.bgCanvas,
  },
  frame: {
    position: "absolute",
    top: "20%",
    left: "18%",
    right: "18%",
    bottom: "20%",
    borderWidth: 2,
    borderColor: "rgba(233,65,127,0.7)",
    borderRadius: 20,
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13.5,
    color: color.text2,
    textAlign: "center",
  },
  manualBox: {
    marginTop: 22,
    paddingHorizontal: spacing.screenX,
  },
  manualLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
    marginBottom: 10,
  },
  manualRow: {
    flexDirection: "row",
    gap: 10,
  },
  manualInput: {
    flex: 1,
    height: 46,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: "Courier",
    letterSpacing: 1.5,
    fontSize: 14,
    color: color.text,
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resultCard: {
    width: "100%",
    borderRadius: radius.cardLarge,
    paddingVertical: 48,
    alignItems: "center",
    gap: 6,
  },
  resultValid: {
    backgroundColor: color.cream,
  },
  resultAlert: {
    backgroundColor: color.pink,
  },
  resultTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  resultTitleValid: { color: color.ink },
  resultTitleAlert: { color: color.white },
  resultName: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
  },
  resultTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: color.white,
  },
  resultHint: {
    marginTop: 10,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: "rgba(21,21,16,0.55)",
  },
});
