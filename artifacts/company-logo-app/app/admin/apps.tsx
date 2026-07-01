import { useLauncher, type AppItem } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppsScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();
  const [newAppName, setNewAppName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const toggleApp = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = config.visibleApps.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    updateConfig({ visibleApps: updated });
  };

  const addApp = () => {
    if (!newAppName.trim()) return;
    const newApp: AppItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: newAppName.trim(),
      packageName: newAppName.trim().toLowerCase().replace(/\s+/g, "."),
      icon: "globe",
      enabled: true,
    };
    updateConfig({ visibleApps: [...config.visibleApps, newApp] });
    setNewAppName("");
    setShowAddForm(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeApp = (id: string) => {
    const updated = config.visibleApps.filter((a) => a.id !== id);
    updateConfig({ visibleApps: updated });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const enabledCount = config.visibleApps.filter((a) => a.enabled).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Manage Apps</Text>
          <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
            <Feather name={showAddForm ? "x" : "plus"} size={22} color="#3A8B3F" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.counter}>{enabledCount} of {config.visibleApps.length} apps visible on home screen</Text>

          {showAddForm && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="App name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newAppName}
                onChangeText={setNewAppName}
                autoFocus
              />
              <TouchableOpacity style={styles.addBtn} onPress={addApp}>
                <Text style={styles.addBtnText}>Add App</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>ALL APPS</Text>
          <View style={styles.card}>
            {config.visibleApps.map((app, idx) => (
              <View
                key={app.id}
                style={[styles.appRow, idx < config.visibleApps.length - 1 && styles.rowBorder]}
              >
                <View style={styles.appLeft}>
                  <View style={[styles.appIconBox, { backgroundColor: app.enabled ? "#1A4A2A" : "rgba(255,255,255,0.06)" }]}>
                    <Feather name="grid" size={18} color={app.enabled ? "#3A8B3F" : "rgba(255,255,255,0.4)"} />
                  </View>
                  <View>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appPackage} numberOfLines={1}>{app.packageName}</Text>
                  </View>
                </View>
                <View style={styles.appRight}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, app.enabled && styles.toggleBtnOn]}
                    onPress={() => toggleApp(app.id)}
                  >
                    <Text style={[styles.toggleBtnText, app.enabled && styles.toggleBtnTextOn]}>
                      {app.enabled ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeApp(app.id)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={16} color="rgba(239,68,68,0.6)" />
                  </TouchableOpacity>
                </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  screenTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  counter: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, textAlign: "center" },
  addForm: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(58,139,63,0.3)",
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addBtn: {
    backgroundColor: "#3A8B3F",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  appRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  appLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  appIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  appName: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_500Medium" },
  appPackage: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, maxWidth: 180 },
  appRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  toggleBtnOn: { backgroundColor: "rgba(58,139,63,0.2)", borderColor: "rgba(58,139,63,0.4)" },
  toggleBtnText: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toggleBtnTextOn: { color: "#3A8B3F" },
  removeBtn: { padding: 4 },
});
