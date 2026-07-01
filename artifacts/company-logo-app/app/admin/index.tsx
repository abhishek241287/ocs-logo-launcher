import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  sub: string;
  route?: string;
  color: string;
  isSwitch?: boolean;
  danger?: boolean;
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "BRANDING",
    items: [
      { id: "logo", icon: "image", label: "Company Logo", sub: "Change the launcher logo", route: "/admin/logo", color: "#1C3B6A" },
      { id: "appearance", icon: "sliders", label: "Appearance", sub: "Colors, theme & company name", route: "/admin/appearance", color: "#3A2A6A" },
      { id: "customer", icon: "user", label: "Customer Branding", sub: "Customer name, device name, support", route: "/admin/customer", color: "#1A4A3A" },
    ],
  },
  {
    title: "DEVICE",
    items: [
      { id: "apps", icon: "grid", label: "Manage Apps", sub: "Control which apps are visible", route: "/admin/apps", color: "#1A3A4A" },
      { id: "wallpaper", icon: "image", label: "Wallpaper", sub: "Home & lock screen wallpaper", route: "/admin/wallpaper", color: "#1A4A2A" },
      { id: "kiosk", icon: "shield", label: "Kiosk Mode", sub: "Lock tablet to approved apps only", color: "#2A1A4A", isSwitch: true },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { id: "pin", icon: "lock", label: "Change PIN", sub: "Update your 6-digit admin PIN", route: "/admin/pin", color: "#4A2A1A" },
      { id: "security", icon: "alert-triangle", label: "Factory Reset Protection", sub: "PIN-gated exit, settings & reset", route: "/admin/security", color: "#4A1A1A", danger: true },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { id: "updates", icon: "download-cloud", label: "OTA Updates", sub: "Check & install launcher updates", route: "/admin/updates", color: "#1A2A4A" },
      { id: "device-info", icon: "info", label: "Device Information", sub: "Hardware, OS, battery & storage", route: "/admin/device-info", color: "#1A3A3A" },
      { id: "config", icon: "settings", label: "Configuration", sub: "Export, import & reset settings", route: "/admin/config", color: "#1A2A3A" },
    ],
  },
];

export default function AdminScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) {
        router.replace("/");
      }
    }, [isAdminAuthenticated])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010", "#071A0A"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <View>
            <Text style={styles.screenTitle}>Admin Panel</Text>
            <Text style={styles.screenSub}>OCS OORJA Launcher</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/")}>
            <Feather name="x" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {config.kioskMode && (
            <View style={styles.kioskBanner}>
              <Feather name="shield" size={14} color="#F59E0B" />
              <Text style={styles.kioskBannerText}>Kiosk Mode is active — only approved apps visible</Text>
            </View>
          )}

          {SECTIONS.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              <View style={styles.card}>
                {section.items.map((item, idx) => {
                  const isLast = idx === section.items.length - 1;
                  if (item.isSwitch) {
                    return (
                      <View key={item.id} style={[styles.row, !isLast && styles.rowBorder]}>
                        <View style={styles.rowLeft}>
                          <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                            <Feather name={item.icon as never} size={18} color="#FFFFFF" />
                          </View>
                          <View style={styles.rowText}>
                            <Text style={styles.rowLabel}>{item.label}</Text>
                            <Text style={styles.rowSub}>{item.sub}</Text>
                          </View>
                        </View>
                        <Switch
                          value={config.kioskMode}
                          onValueChange={(v) => updateConfig({ kioskMode: v })}
                          trackColor={{ false: "rgba(255,255,255,0.1)", true: "#3A8B3F" }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.row, !isLast && styles.rowBorder]}
                      onPress={() => item.route && router.push(item.route as never)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                          <Feather name={item.icon as never} size={18} color={item.danger ? "#EF4444" : "#FFFFFF"} />
                        </View>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowLabel, item.danger && styles.dangerLabel]}>{item.label}</Text>
                          <Text style={styles.rowSub}>{item.sub}</Text>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.versionText}>OCS OORJA Launcher v1.0 · Admin Mode</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071A0A" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  screenTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  screenSub: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  doneBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  kioskBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)", padding: 12, marginBottom: 20,
  },
  kioskBannerText: { color: "#F59E0B", fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2, marginBottom: 8, marginTop: 20, marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerLabel: { color: "#EF4444" },
  rowSub: { color: "rgba(255,255,255,0.38)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  versionText: { color: "rgba(255,255,255,0.18)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20 },
});
