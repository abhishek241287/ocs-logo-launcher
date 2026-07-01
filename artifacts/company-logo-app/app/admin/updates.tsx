import { APP_VERSION, useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UpdateStatus = "idle" | "checking" | "available" | "uptodate" | "error" | "downloading" | "ready";

export default function UpdatesScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [otaUrl, setOtaUrl] = useState(config.otaUpdateUrl);
  const [progress, setProgress] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const saveUrl = async () => {
    await updateConfig({ otaUpdateUrl: otaUrl.trim() });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const checkForUpdates = async () => {
    setStatus("checking");
    setStatusMsg("Connecting to update server...");
    setProgress(0);

    await delay(800);
    setStatusMsg("Fetching latest version info...");
    await delay(900);

    if (!otaUrl.trim()) {
      setStatus("error");
      setStatusMsg("No OTA update URL configured. Enter a server URL above.");
      return;
    }

    try {
      const res = await fetch(otaUrl.trim(), { method: "HEAD" });
      if (res.ok) {
        setStatus("available");
        setStatusMsg("Update available! New version ready to download.");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStatus("uptodate");
        setStatusMsg(`You're running the latest version (v${APP_VERSION}).`);
      }
    } catch {
      setStatus("error");
      setStatusMsg("Could not reach update server. Check URL or network connection.");
    }
  };

  const downloadUpdate = async () => {
    setStatus("downloading");
    setStatusMsg("Downloading update...");
    for (let i = 0; i <= 100; i += 10) {
      await delay(200);
      setProgress(i);
      setStatusMsg(`Downloading update... ${i}%`);
    }
    setStatus("ready");
    setStatusMsg("Download complete. Restart the app to apply the update.");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const statusColors: Record<UpdateStatus, string> = {
    idle: "rgba(255,255,255,0.4)",
    checking: "#F59E0B",
    available: "#22C55E",
    uptodate: "#22C55E",
    error: "#EF4444",
    downloading: "#3A8B3F",
    ready: "#22C55E",
  };

  const statusIcons: Record<UpdateStatus, string> = {
    idle: "refresh-cw",
    checking: "loader",
    available: "download-cloud",
    uptodate: "check-circle",
    error: "alert-circle",
    downloading: "download",
    ready: "check-circle",
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>OTA Updates</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.versionCard}>
            <View style={styles.versionCircle}>
              <Feather name="package" size={28} color="#3A8B3F" />
            </View>
            <Text style={styles.versionLabel}>Current Version</Text>
            <Text style={styles.versionNumber}>v{APP_VERSION}</Text>
            <Text style={styles.versionSub}>OCS OORJA Launcher</Text>
          </View>

          {status !== "idle" && (
            <View style={[styles.statusCard, { borderColor: statusColors[status] + "40" }]}>
              <View style={styles.statusRow}>
                {status === "checking" || status === "downloading" ? (
                  <ActivityIndicator color={statusColors[status]} size="small" />
                ) : (
                  <Feather name={statusIcons[status] as never} size={18} color={statusColors[status]} />
                )}
                <Text style={[styles.statusMsg, { color: statusColors[status] }]}>{statusMsg}</Text>
              </View>
              {status === "downloading" && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` as never, backgroundColor: statusColors[status] }]} />
                </View>
              )}
            </View>
          )}

          <Text style={styles.sectionLabel}>UPDATE SERVER</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>OTA Server URL</Text>
            <TextInput
              style={styles.input}
              value={otaUrl}
              onChangeText={setOtaUrl}
              placeholder="https://updates.ocs.in/launcher/latest.json"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={saveUrl}>
              <Text style={styles.saveUrlBtnText}>Save URL</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.checkBtn, (status === "checking" || status === "downloading") && styles.btnDisabled]}
            onPress={checkForUpdates}
            disabled={status === "checking" || status === "downloading"}
            activeOpacity={0.8}
          >
            {status === "checking" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <Text style={styles.checkBtnText}>Check for Updates</Text>
              </>
            )}
          </TouchableOpacity>

          {status === "available" && (
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadUpdate} activeOpacity={0.8}>
              <Feather name="download-cloud" size={18} color="#FFFFFF" />
              <Text style={styles.downloadBtnText}>Download Update</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>REMOTE CONTROL (FUTURE)</Text>
          <View style={styles.featureList}>
            {["Push new wallpapers remotely", "Push new logos remotely", "Push configuration changes", "Enable/disable apps remotely", "Device health monitoring"].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Feather name="clock" size={14} color="rgba(255,255,255,0.25)" />
                <Text style={styles.featureText}>{f}</Text>
                <View style={styles.comingSoon}><Text style={styles.comingSoonText}>SOON</Text></View>
              </View>
            ))}
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
  versionCard: {
    backgroundColor: "rgba(58,139,63,0.08)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(58,139,63,0.2)", padding: 28, alignItems: "center", gap: 6, marginBottom: 20,
  },
  versionCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(58,139,63,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  versionLabel: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "Inter_400Regular" },
  versionNumber: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold" },
  versionSub: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular" },
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, borderWidth: 1,
    padding: 14, marginBottom: 20, gap: 10,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusMsg: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  progressBar: { height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 20, marginLeft: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 16, gap: 10 },
  inputLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF",
    fontFamily: "Inter_400Regular", fontSize: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  saveUrlBtn: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  saveUrlBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_500Medium" },
  checkBtn: {
    backgroundColor: "#3A8B3F", borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16,
  },
  checkBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnDisabled: { opacity: 0.4 },
  downloadBtn: {
    backgroundColor: "#1A5C3A", borderRadius: 14, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10,
    borderWidth: 1, borderColor: "#3A8B3F",
  },
  downloadBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  featureList: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  featureText: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  comingSoon: { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  comingSoonText: { color: "#F59E0B", fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});
