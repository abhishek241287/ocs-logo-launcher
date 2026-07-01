import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WallpaperTarget = "home" | "lock" | "both";
const TARGETS: { id: WallpaperTarget; label: string; icon: string; sub: string }[] = [
  { id: "home", label: "Home Screen", icon: "home", sub: "Set as home screen wallpaper" },
  { id: "lock", label: "Lock Screen", icon: "lock", sub: "Set as lock screen wallpaper" },
  { id: "both", label: "Both Screens", icon: "smartphone", sub: "Apply to home and lock screen" },
];

const TARGET_HINT: Record<WallpaperTarget, string> = {
  home: "home screen",
  lock: "lock screen",
  both: "home screen and lock screen",
};

export default function WallpaperScreen() {
  const { isAdminAuthenticated } = useLauncher();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<WallpaperTarget>("both");
  const [isApplying, setIsApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const pickImage = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Photo library access is required. Please enable it in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setSelectedImage(result.assets[0].uri);
  };

  const applyWallpaper = async () => {
    if (!selectedImage) return;
    setIsApplying(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (Platform.OS === "android") {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") { setErrorMsg("Storage permission required."); return; }
        const asset = await MediaLibrary.createAssetAsync(selectedImage);
        await IntentLauncher.startActivityAsync("android.intent.action.ATTACH_DATA", {
          data: asset.uri, type: "image/jpeg", extra: { mimeType: "image/jpeg" }, flags: 1,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMsg(`Wallpaper chooser opened. Select "${TARGET_HINT[selectedTarget]}" to apply.`);
      } else if (Platform.OS === "ios") {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) { setErrorMsg("Sharing not available on this device."); return; }
        await Sharing.shareAsync(selectedImage, {
          mimeType: "image/jpeg",
          dialogTitle: `Set as ${TARGET_HINT[selectedTarget]}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMsg(`In the share sheet, tap "Use as Wallpaper" and select ${TARGET_HINT[selectedTarget]}.`);
      } else {
        setErrorMsg("Wallpaper setting not available on web preview.");
      }
    } catch (err: unknown) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (!msg.includes("cancel") && !msg.includes("dismiss")) {
        setErrorMsg("Failed to apply wallpaper. Please try again.");
      }
    } finally {
      setIsApplying(false);
    }
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
          <Text style={styles.screenTitle}>Change Wallpaper</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {successMsg ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ {successMsg}</Text>
            </View>
          ) : null}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>SELECT IMAGE</Text>
          <TouchableOpacity style={styles.pickerCard} onPress={pickImage} activeOpacity={0.7}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.pickerPlaceholder}>
                <Feather name="image" size={40} color="rgba(255,255,255,0.3)" />
                <Text style={styles.pickerText}>Choose from Photo Library</Text>
                <Text style={styles.pickerSub}>Tap to browse photos</Text>
              </View>
            )}
          </TouchableOpacity>
          {selectedImage && (
            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
              <Text style={styles.changeBtnText}>Choose different photo</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>APPLY TO</Text>
          <View style={styles.card}>
            {TARGETS.map((t, idx) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.row, idx < TARGETS.length - 1 && styles.rowBorder, selectedTarget === t.id && styles.rowSelected]}
                onPress={() => {
                  setSelectedTarget(t.id);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, { backgroundColor: selectedTarget === t.id ? "#1A4A2A" : "rgba(255,255,255,0.06)" }]}>
                    <Feather name={t.icon as never} size={18} color={selectedTarget === t.id ? "#3A8B3F" : "rgba(255,255,255,0.5)"} />
                  </View>
                  <View>
                    <Text style={styles.rowLabel}>{t.label}</Text>
                    <Text style={styles.rowSub}>{t.sub}</Text>
                  </View>
                </View>
                <View style={[styles.radio, selectedTarget === t.id && styles.radioSelected]}>
                  {selectedTarget === t.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {Platform.OS === "ios" && (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                On iOS, a share sheet will open. Tap "Use as Wallpaper" and choose {TARGET_HINT[selectedTarget]}.
              </Text>
            </View>
          )}
          {Platform.OS === "android" && (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                The system wallpaper chooser will open. Select {TARGET_HINT[selectedTarget]} there.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.applyBtn, (!selectedImage || isApplying) && styles.applyBtnDisabled]}
            onPress={applyWallpaper}
            disabled={!selectedImage || isApplying}
            activeOpacity={0.8}
          >
            {isApplying ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Set Wallpaper</Text>}
          </TouchableOpacity>
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
  successBanner: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", padding: 14, marginBottom: 16 },
  successText: { color: "#22C55E", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  errorBanner: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", padding: 14, marginBottom: 16 },
  errorText: { color: "#EF4444", fontFamily: "Inter_400Regular", fontSize: 13 },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 8, marginTop: 16, marginLeft: 4 },
  pickerCard: { height: 180, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 8 },
  pickerPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pickerText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerSub: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "Inter_400Regular" },
  previewImage: { width: "100%", height: "100%" },
  changeBtn: { alignSelf: "center", paddingVertical: 6, paddingHorizontal: 16, marginBottom: 4 },
  changeBtnText: { color: "#3A8B3F", fontSize: 14, fontFamily: "Inter_500Medium" },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowSelected: { backgroundColor: "rgba(58,139,63,0.07)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { color: "rgba(255,255,255,0.38)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: "#3A8B3F" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#3A8B3F" },
  note: { backgroundColor: "rgba(58,139,63,0.07)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(58,139,63,0.2)", padding: 14, marginVertical: 8 },
  noteText: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  applyBtn: { backgroundColor: "#3A8B3F", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  applyBtnDisabled: { opacity: 0.35 },
  applyBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
