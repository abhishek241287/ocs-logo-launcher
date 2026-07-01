import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MENU = [
  {
    id: "wallpaper",
    route: "/admin/wallpaper",
    icon: "image",
    label: "Wallpaper",
    sub: "Set the launcher background image",
    color: "#1C3B6A",
  },
  {
    id: "apps",
    route: "/admin/apps",
    icon: "grid",
    label: "Allowed Apps",
    sub: "Choose which apps appear on the home screen",
    color: "#1A4A2A",
  },
  {
    id: "debug",
    route: "/admin/debug",
    icon: "terminal",
    label: "Developer Debug",
    sub: "App launch log with status and error details",
    color: "#3A2A5A",
  },
];

export default function AdminScreen() {
  const { isAdminAuthenticated } = useLauncher();

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#071A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <Text style={styles.title}>Admin</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/")}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <Feather name={item.icon as never} size={22} color="#FFFFFF" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  doneBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menu: { padding: 16, gap: 12, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_500Medium", marginBottom: 2 },
  rowSub: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular" },
});
