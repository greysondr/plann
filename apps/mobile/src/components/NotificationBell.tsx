import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../context/AppStore";
import { BellIcon } from "./icons";
import { color, fontFamily } from "../theme/tokens";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useAppStore();
  return (
    <Pressable style={styles.button} onPress={() => router.push("/notificaciones")} accessibilityRole="button" accessibilityLabel="Notificaciones">
      <BellIcon size={22} active={unreadCount > 0} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fontFamily.extraBold, fontSize: 10.5, color: color.white },
});
