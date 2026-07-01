import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConfigScreen() {
  const { exportConfig, importConfig, resetConfig, isAdminAuthenticated } = useLauncher();
  const [exportedJson, setExportedJson] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [status, setStatus] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const handleExport = () => {
    const json = exportConfig();
    setExportedJson(json);
    setStatus("Configuration exported. Copy the text below.");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    const ok = await importConfig(importText.trim());
    if (ok) {
      setStatus("Configuration imported successfully.");
      setImportText("");
      setShowImport(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStatus("Import failed. Invalid configuration format.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleReset = () => {
    if (Platform.OS === "web") {
      resetConfig();
      setStatus("Configuration reset to defaults.");
      return;
    }
    Alert.alert(
      "Reset Configuration",
      "This will reset all launcher settings to defaults. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetConfig();
            setStatus("Configuration reset to defaults.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleRestart = () => {
    setStatus("On a real device, the launcher would restart now.");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
          <Text style={styles.screenTitle}>Configuration</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {status ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>BACKUP & RESTORE</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleExport} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#1A3A4A" }]}>
                  <Feather name="download" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Export Configuration</Text>
                  <Text style={styles.rowSub}>Save launcher settings as JSON</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setShowImport(!showImport)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#1A4A2A" }]}>
                  <Feather name="upload" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Import Configuration</Text>
                  <Text style={styles.rowSub}>Restore from exported JSON</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {exportedJson ? (
            <>
              <Text style={styles.sectionLabel}>EXPORTED CONFIG (copy this)</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText} selectable>{exportedJson}</Text>
              </View>
            </>
          ) : null}

          {showImport && (
            <>
              <Text style={styles.sectionLabel}>PASTE CONFIGURATION JSON</Text>
              <TextInput
                style={styles.importInput}
                multiline
                numberOfLines={6}
                value={importText}
                onChangeText={setImportText}
                placeholder="Paste exported JSON here..."
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
              <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
                <Text style={styles.importBtnText}>Import</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.sectionLabel}>SYSTEM</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleRestart} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#2A3A1A" }]}>
                  <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Restart Launcher</Text>
                  <Text style={styles.rowSub}>Reload the launcher app</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleReset} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#4A1A1A" }]}>
                  <Feather name="alert-triangle" size={18} color="#EF4444" />
                </View>
                <View>
                  <Text style={[styles.rowLabel, { color: "#EF4444" }]}>Reset to Defaults</Text>
                  <Text style={styles.rowSub}>Clear all configuration</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(239,68,68,0.3)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>
            Future: Remote configuration, OTA updates, device registration, and cloud synchronization.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071A0A" },
  safe: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  screenTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  statusBanner: { backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)", padding: 12, marginBottom: 16 },
  statusText: { color: "#22C55E", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 20, marginLeft: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { color: "rgba(255,255,255,0.38)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  jsonBox: { backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 14, marginBottom: 8, maxHeight: 200 },
  jsonText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  importInput: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", color: "#FFFFFF", fontFamily: "Inter_400Regular", fontSize: 13, padding: 14, height: 140, textAlignVertical: "top" },
  importBtn: { backgroundColor: "#3A8B3F", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 10, marginBottom: 8 },
  importBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  infoText: { color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20, lineHeight: 18 },
});
