import { CURATED_APPS, useLauncher } from "@/context/LauncherContext";
import {
  type LaunchLogEntry,
  clearLaunchLog,
  getLaunchLog,
  subscribeLaunchLog,
} from "@/utils/launchLog";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const IS_EXPO_GO =
  (Constants.appOwnership as string | null) === "expo" ||
  (Constants as unknown as Record<string, string>).executionEnvironment === "storeClient";

const EXPO_VERSION: string =
  (Constants as unknown as Record<string, string>).expoVersion ??
  Constants.nativeAppVersion ??
  "unknown";

const SDK_VERSION: number | string =
  Platform.OS === "android" ? Platform.Version : Platform.OS;

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: LaunchLogEntry["status"] }) {
  const bg =
    status === "success" ? "#1A4A2A" : status === "failed" ? "#4A1A1A" : "#2A2A2A";
  const color =
    status === "success" ? "#4ADE80" : status === "failed" ? "#F87171" : "#9CA3AF";
  const label =
    status === "success" ? "✓ OK" : status === "failed" ? "✗ FAIL" : "– SKIP";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function DebugScreen() {
  const { isAdminAuthenticated } = useLauncher();
  const [log, setLog] = useState<LaunchLogEntry[]>(() => getLaunchLog());

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) {
        router.replace("/");
        return;
      }
      setLog(getLaunchLog());
    }, [isAdminAuthenticated])
  );

  useEffect(() => {
    return subscribeLaunchLog(() => setLog(getLaunchLog()));
  }, []);

  const handleClear = () => {
    Alert.alert("Clear Log", "Remove all launch log entries?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearLaunchLog();
          setLog([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#120820"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Admin</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Debug</Text>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {IS_EXPO_GO && (
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={16} color="#FBBF24" />
              <View style={styles.warningText}>
                <Text style={styles.warningTitle}>Running inside Expo Go</Text>
                <Text style={styles.warningBody}>
                  Expo Go sandboxes certain Android intents. Apps that fail here may work
                  correctly in a standalone APK build. Re-validate app launching after
                  building the standalone APK before concluding an app is broken.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.envBox}>
            <Text style={styles.sectionLabel}>ENVIRONMENT</Text>
            <View style={styles.envRow}>
              <Text style={styles.envKey}>Context</Text>
              <Text style={[styles.envVal, IS_EXPO_GO && styles.envValWarn]}>
                {IS_EXPO_GO ? "⚠ Expo Go" : "✓ Standalone APK"}
              </Text>
            </View>
            <View style={styles.envRow}>
              <Text style={styles.envKey}>Android SDK</Text>
              <Text style={styles.envVal}>API {SDK_VERSION}</Text>
            </View>
            <View style={styles.envRow}>
              <Text style={styles.envKey}>Expo Version</Text>
              <Text style={styles.envVal}>{EXPO_VERSION}</Text>
            </View>
            <View style={styles.envRow}>
              <Text style={styles.envKey}>Platform</Text>
              <Text style={styles.envVal}>{Platform.OS}</Text>
            </View>
          </View>

          <View style={styles.appsTable}>
            <Text style={styles.sectionLabel}>CURATED APP REGISTRY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 90 }]}>App</Text>
                  <Text style={[styles.th, { width: 220 }]}>Package / Intent</Text>
                  <Text style={[styles.th, { width: 70 }]}>Type</Text>
                </View>
                {CURATED_APPS.map((app) => (
                  <View key={app.id} style={styles.tableRow}>
                    <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>
                      {app.name}
                    </Text>
                    <Text style={[styles.tdMono, { width: 220 }]} numberOfLines={1}>
                      {app.packageName}
                    </Text>
                    <Text style={[styles.tdDim, { width: 70 }]}>
                      {app.intentAction ? "action" : "package"}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginTop: 16, marginBottom: 10 }]}>
            LAUNCH LOG ({log.length} entries)
          </Text>

          {log.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>
                No launches yet.{"\n"}Tap an app on the home screen to record its launch attempt.
              </Text>
            </View>
          )}

          <View style={styles.logList}>
            {log.map((entry, i) => (
              <View key={i} style={[styles.logEntry, entry.status === "failed" && styles.logEntryFailed]}>
                <View style={styles.logEntryTop}>
                  <Text style={styles.logAppName}>{entry.appName}</Text>
                  <StatusBadge status={entry.status} />
                  <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
                </View>

                <Text style={styles.logMono}>pkg:     {entry.packageName}</Text>
                <Text style={styles.logMono}>intent:  {entry.intent}</Text>
                <Text style={styles.logMono}>flags:   {entry.flags}</Text>
                <Text style={styles.logMono}>sdk:     Android API {entry.sdkVersion}</Text>
                <Text style={styles.logMono}>expo:    {entry.expoVersion}</Text>
                <Text style={styles.logMono}>
                  context: {entry.isExpoGo ? "⚠ Expo Go" : "Standalone APK"}
                </Text>

                {entry.error ? (
                  <View style={styles.errorBlock}>
                    <Text style={styles.logErrorLabel}>ERROR</Text>
                    <Text style={styles.logError}>{entry.error}</Text>
                    {entry.errorStack ? (
                      <>
                        <Text style={[styles.logErrorLabel, { marginTop: 6 }]}>STACK TRACE</Text>
                        <Text style={styles.logErrorStack}>{entry.errorStack}</Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_400Regular" },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  clearBtn: { width: 80, alignItems: "flex-end" },
  clearBtnText: { color: "#F87171", fontSize: 14, fontFamily: "Inter_500Medium" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  warningBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  warningText: { flex: 1, gap: 4 },
  warningTitle: { color: "#FBBF24", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  warningBody: {
    color: "rgba(251,191,36,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  envBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  envRow: { flexDirection: "row", justifyContent: "space-between" },
  envKey: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_400Regular" },
  envVal: { color: "#FFFFFF", fontSize: 12, fontFamily: MONO },
  envValWarn: { color: "#FBBF24" },

  appsTable: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 4,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  th: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tableRow: { flexDirection: "row", paddingVertical: 3 },
  td: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_500Medium" },
  tdMono: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: MONO },
  tdDim: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular" },

  logList: { gap: 8 },
  emptyState: { alignItems: "center", paddingTop: 32, gap: 12 },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  logEntry: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  logEntryFailed: {
    borderColor: "rgba(248,113,113,0.2)",
    backgroundColor: "rgba(248,113,113,0.04)",
  },
  logEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  logAppName: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  logTime: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  logMono: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: MONO, lineHeight: 16 },
  errorBlock: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(248,113,113,0.2)",
    paddingTop: 8,
    gap: 3,
  },
  logErrorLabel: {
    color: "rgba(248,113,113,0.6)",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  logError: { color: "#F87171", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  logErrorStack: {
    color: "rgba(248,113,113,0.6)",
    fontSize: 10,
    fontFamily: MONO,
    lineHeight: 15,
  },
});
