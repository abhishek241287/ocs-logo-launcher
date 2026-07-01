import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LogoScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();
  const [previewUri, setPreviewUri] = useState<string | null>(config.customLogoUri ?? null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setSuccess(false);
    }
  };

  const saveCustomLogo = async () => {
    if (!previewUri) return;
    setSaving(true);
    await updateConfig({ logoSource: "custom", customLogoUri: previewUri });
    setSaving(false);
    setSuccess(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSuccess(false), 3000);
  };

  const resetToDefault = async () => {
    await updateConfig({ logoSource: "default", customLogoUri: undefined });
    setPreviewUri(null);
    setSuccess(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const currentSource = config.logoSource === "custom" && config.customLogoUri
    ? { uri: config.customLogoUri }
    : require("../../assets/images/ocs-logo.jpg");

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Company Logo</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.content}>
          {success && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Logo updated successfully</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>CURRENT LOGO</Text>
          <View style={styles.currentLogoCard}>
            <Image source={currentSource} style={styles.currentLogo} resizeMode="contain" />
            <Text style={styles.logoStatusText}>
              {config.logoSource === "custom" ? "Custom logo active" : "Default OCS OORJA logo"}
            </Text>
          </View>

          {previewUri && previewUri !== config.customLogoUri && (
            <>
              <Text style={styles.sectionLabel}>PREVIEW</Text>
              <View style={styles.previewCard}>
                <Image source={{ uri: previewUri }} style={styles.previewLogo} resizeMode="contain" />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.pickBtn} onPress={pickLogo} activeOpacity={0.8}>
            <Feather name="upload" size={18} color="#FFFFFF" />
            <Text style={styles.pickBtnText}>Choose Custom Logo</Text>
          </TouchableOpacity>

          {previewUri && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={saveCustomLogo}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Apply Logo</Text>
              )}
            </TouchableOpacity>
          )}

          {config.logoSource === "custom" && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetToDefault} activeOpacity={0.8}>
              <Text style={styles.resetBtnText}>Reset to Default</Text>
            </TouchableOpacity>
          )}
        </View>
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
  content: { flex: 1, padding: 20 },
  successBanner: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", padding: 14, marginBottom: 20 },
  successText: { color: "#22C55E", fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 16, marginLeft: 4 },
  currentLogoCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 24, alignItems: "center", marginBottom: 8 },
  currentLogo: { width: 120, height: 120, borderRadius: 16, marginBottom: 12 },
  logoStatusText: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular" },
  previewCard: { backgroundColor: "rgba(58,139,63,0.07)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(58,139,63,0.2)", padding: 20, alignItems: "center", marginBottom: 8 },
  previewLogo: { width: 100, height: 100, borderRadius: 14 },
  pickBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginTop: 20 },
  pickBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  saveBtn: { backgroundColor: "#3A8B3F", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resetBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  resetBtnText: { color: "rgba(239,68,68,0.7)", fontSize: 14, fontFamily: "Inter_500Medium" },
});
