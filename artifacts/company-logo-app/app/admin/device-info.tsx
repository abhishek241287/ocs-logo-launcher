import { APP_VERSION, useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Battery from "expo-battery";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface InfoRow {
  label: string;
  value: string;
  icon: string;
}

export default function DeviceInfoScreen() {
  const { config, isAdminAuthenticated } = useLauncher();
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryState, setBatteryState] = useState<string>("Unknown");

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    Battery.getBatteryLevelAsync().then((l) => setBatteryLevel(Math.round(l * 100))).catch(() => {});
    Battery.getBatteryStateAsync().then((s) => {
      const map: Record<number, string> = {
        [Battery.BatteryState.CHARGING]: "Charging",
        [Battery.BatteryState.FULL]: "Full",
        [Battery.BatteryState.UNPLUGGED]: "Unplugged",
        [Battery.BatteryState.UNKNOWN]: "Unknown",
      };
      setBatteryState(map[s] ?? "Unknown");
    }).catch(() => {});
  }, []);

  const rows: InfoRow[] = [
    { label: "Device Name", value: config.deviceName || "OCS Tablet", icon: "smartphone" },
    { label: "Platform", value: Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web Preview", icon: "cpu" },
    { label: "OS Version", value: typeof Platform.Version === "string" ? Platform.Version : String(Platform.Version), icon: "layers" },
    { label: "App Version", value: APP_VERSION, icon: "package" },
    { label: "Battery Level", value: batteryLevel !== null ? `${batteryLevel}%` : "N/A", icon: "battery" },
    { label: "Battery Status", value: batteryState, icon: "zap" },
    { label: "Customer", value: config.customerName || "Not configured", icon: "user" },
    { label: "Support Number", value: config.supportNumber || "Not configured", icon: "phone" },
    { label: "IMEI", value: "Not available (OS restriction)", icon: "credit-card" },
    { label: "Serial Number", value: "Not available (OS restriction)", icon: "hash" },
    { label: "Wi-Fi MAC", value: "Not available (Android privacy policy)", icon: "wifi" },
    { label: "RAM", value: "Not available on web preview", icon: "server" },
    { label: "Storage", value: "Not available on web preview", icon: "hard-drive" },
    { label: "Config Last Updated", value: new Date(config.lastUpdated).toLocaleString(), icon: "clock" },
  ];

  const deviceRows = rows.slice(0, 4);
  const statusRows = rows.slice(4, 8);
  const restrictedRows = rows.slice(8, 13);
  const sysRows = rows.slice(13);

  const renderSection = (title: string, data: InfoRow[]) => (
    <>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>
        {data.map((row, idx) => (
          <View key={row.label} style={[styles.row, idx < data.length - 1 && styles.rowBorder]}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Feather name={row.icon as never} size={16} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Device Information</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {renderSection("DEVICE", deviceRows)}
          {renderSection("STATUS", statusRows)}
          {renderSection("HARDWARE (RESTRICTED)", restrictedRows)}
          {renderSection("SYSTEM", sysRows)}

          <View style={styles.noteBanner}>
            <Feather name="info" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.noteText}>
              IMEI, serial number, Wi-Fi MAC, RAM, and storage require a native Android build and are unavailable in web preview or restricted by Android privacy policy.
            </Text>
          </View>
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
  screenTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2, marginBottom: 8, marginTop: 20, marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 28, alignItems: "center" },
  rowLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular" },
  rowValue: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "55%", textAlign: "right" },
  noteBanner: {
    flexDirection: "row", gap: 10, marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14,
  },
  noteText: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
