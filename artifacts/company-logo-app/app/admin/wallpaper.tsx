import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WallpaperScreen() {
  const { isAdminAuthenticated, wallpaperUri, setWallpaper } = useLauncher();
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSaving(true);
      await setWallpaper(result.assets[0].uri);
      setSaving(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert("Saved", "Wallpaper set successfully.");
    }
  };

  const removeWallpaper = async () => {
    Alert.alert("Remove Wallpaper", "Are you sure you want to remove the wallpaper?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await setWallpaper(null);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#071A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Admin</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Wallpaper</Text>
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>CURRENT WALLPAPER</Text>
          <View style={styles.previewBox}>
            {wallpaperUri ? (
              <Image source={{ uri: wallpaperUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.noWallpaper}>
                <Feather name="image" size={40} color="rgba(255,255,255,0.2)" />
                <Text style={styles.noWallpaperText}>No wallpaper set</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage} activeOpacity={0.8} disabled={saving}>
            <Feather name="upload" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Pick from Gallery"}</Text>
          </TouchableOpacity>

          {wallpaperUri ? (
            <TouchableOpacity style={styles.dangerBtn} onPress={removeWallpaper} activeOpacity={0.8}>
              <Feather name="trash-2" size={18} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Remove Wallpaper</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
  content: { padding: 20, gap: 16 },
  sectionLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  previewBox: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  previewImage: { width: "100%", height: "100%" },
  noWallpaper: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  noWallpaperText: { color: "rgba(255,255,255,0.3)", fontSize: 14, fontFamily: "Inter_400Regular" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  dangerBtnText: { color: "#EF4444", fontSize: 15, fontFamily: "Inter_500Medium" },
});
