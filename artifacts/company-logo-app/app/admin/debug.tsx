import { CURATED_APPS } from "@/context/LauncherContext";
import {
  type LaunchLogEntry,
  clearLaunchLog,
  getLaunchLog,
  subscribeLaunchLog,
} from "@/utils/launchLog";
import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
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

        <Text style={[styles.sectionLabel, { paddingHorizontal: 16, marginTop: 12 }]}>
          LAUNCH LOG ({log.length} entries)
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.logList}>
          {log.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>
                No launches yet.{"\n"}Tap an app on the home screen to record its launch attempt.
              </Text>
            </View>
          )}
          {log.map((entry, i) => (
            <View key={i} style={styles.logEntry}>
              <View style={styles.logEntryTop}>
                <Text style={styles.logAppName}>{entry.appName}</Text>
                <StatusBadge status={entry.status} />
                <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
              </View>
              <Text style={styles.logMono} numberOfLines={2}>
                pkg: {entry.packageName}
              </Text>
              <Text style={styles.logMono} numberOfLines={2}>
                intent: {entry.intent}
              </Text>
              {entry.error ? (
                <Text style={styles.logError} numberOfLines={4}>
                  ⚠ {entry.error}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
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

  appsTable: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  th: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  tableRow: { flexDirection: "row", paddingVertical: 4 },
  td: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_500Medium" },
  tdMono: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  tdDim: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  scroll: { flex: 1 },
  logList: { padding: 12, gap: 8, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 12 },
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
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  logEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  logAppName: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  logTime: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  logMono: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  logError: {
    color: "#F87171",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 16,
  },
});
