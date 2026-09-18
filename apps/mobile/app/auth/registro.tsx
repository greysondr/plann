import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../src/components/Logo";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

export default function RegistroScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, signIn } = useAppStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 1 && email.trim().length > 3 && password.length >= 8 && !loading;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await signUp(email.trim().toLowerCase(), password, fullName.trim());
    if (!result.ok) {
      setLoading(false);
      setError(result.reason ?? "No pudimos crear tu cuenta.");
      return;
    }
    // El proyecto local no exige confirmar el correo; si en producción se
    // activa la confirmación, este signIn simplemente fallará con un
    // mensaje claro y el usuario revisa su bandeja.
    const login = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!login.ok) {
      setError("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
      return;
    }
    router.replace("/");
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 60, paddingHorizontal: spacing.screenX, paddingBottom: 40 }}>
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Logo />
      </View>

      <Text style={styles.title}>Crea tu cuenta</Text>
      <Text style={styles.subtitle}>Para comprar tickets, guardar favoritos y sumar puntos Plann.</Text>

      <View style={{ gap: 12, marginTop: 28 }}>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nombre completo"
          placeholderTextColor={color.text4}
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo"
          placeholderTextColor={color.text4}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña (mínimo 8 caracteres)"
          placeholderTextColor={color.text4}
          secureTextEntry
          style={styles.input}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <PrimaryButton label={loading ? " " : "Crear cuenta"} disabled={!canSubmit} onPress={handleSubmit} style={{ marginTop: 20 }} />
      {loading && <ActivityIndicator color={color.pink} style={{ marginTop: -46 }} />}

      <Pressable style={{ marginTop: 20, alignItems: "center" }} onPress={() => router.back()}>
        <Text style={styles.link}>Ya tengo cuenta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 24,
    color: color.text,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: color.text3,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  input: {
    height: 52,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  error: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.pink,
  },
  link: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: color.pink,
  },
});
