import { useLauncher } from "@/context/LauncherContext";
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

const BG_PRESETS = [
  { label: "Forest Dark", bg: "#0A1A0F", accent: "#3A8B3F" },
  { label: "Deep Green", bg: "#071A0A", accent: "#4CAF50" },
  { label: "Slate Dark", bg: "#0D1117", accent: "#3A8B3F" },
  { label: "Navy", bg: "#0A0F1A", accent: "#2E7D9A" },
  { label: "Charcoal", bg: "#141414", accent: "#3A8B3F" },
  { label: "Midnight", bg: "#06050F", accent: "#5B4FCF" },
];

const ACCENT_PRESETS = [
  "#3A8B3F", "#4CAF50", "#66BB6A", "#2E7D32",
  "#1976D2", "#42A5F5", "#F59E0B", "#EF4444",
];

export default function AppearanceScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();
  const [companyName, setCompanyName] = useState(config.companyName);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const applyPreset = (preset: typeof BG_PRESETS[0]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateConfig({ backgroundColor: preset.bg, accentColor: preset.accent });
  };

  const saveCompanyName = async () => {
    if (!companyName.trim()) return;
    await updateConfig({ companyName: companyName.trim() });
    setSaved(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 2500);
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
          <Text style={styles.screenTitle}>Appearance</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {saved && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Changes saved</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>COMPANY NAME</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Company name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveCompanyName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>COLOR THEMES</Text>
          <View style={styles.presetsGrid}>
            {BG_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.presetCard, { backgroundColor: p.bg }, config.backgroundColor === p.bg && styles.presetCardSelected]}
                onPress={() => applyPreset(p)}
                activeOpacity={0.8}
              >
                <View style={[styles.accentDot, { backgroundColor: p.accent }]} />
                <Text style={styles.presetLabel}>{p.label}</Text>
                {config.backgroundColor === p.bg && (
                  <View style={styles.checkMark}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>ACCENT COLOR</Text>
          <View style={styles.accentRow}>
            {ACCENT_PRESETS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.accentSwatch, { backgroundColor: color }, config.accentColor === color && styles.accentSwatchSelected]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateConfig({ accentColor: color });
                }}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>PREVIEW</Text>
          <View style={[styles.previewCard, { backgroundColor: config.backgroundColor }]}>
            <View style={[styles.previewAccentBar, { backgroundColor: config.accentColor }]} />
            <Text style={[styles.previewCompanyName, { color: "#FFFFFF" }]}>{config.companyName}</Text>
            <Text style={styles.previewTagline}>POWERED BY OCS OORJA</Text>
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
  successBanner: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", padding: 12, marginBottom: 16 },
  successText: { color: "#22C55E", fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 20, marginLeft: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14, gap: 10 },
  input: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF", fontFamily: "Inter_500Medium", fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  saveBtn: { backgroundColor: "#3A8B3F", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  presetsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetCard: { width: "47%", borderRadius: 12, padding: 14, borderWidth: 2, borderColor: "transparent", position: "relative", flexDirection: "row", alignItems: "center", gap: 10 },
  presetCardSelected: { borderColor: "#3A8B3F" },
  accentDot: { width: 16, height: 16, borderRadius: 8 },
  presetLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  checkMark: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: "#3A8B3F", alignItems: "center", justifyContent: "center" },
  accentRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  accentSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: "transparent" },
  accentSwatchSelected: { borderColor: "#FFFFFF" },
  previewCard: { borderRadius: 16, padding: 24, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  previewAccentBar: { width: 60, height: 4, borderRadius: 2, marginBottom: 16 },
  previewCompanyName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 4 },
  previewTagline: { color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
});
