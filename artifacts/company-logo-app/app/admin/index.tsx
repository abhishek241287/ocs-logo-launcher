import { CURATED_APPS, useLauncher } from "@/context/LauncherContext";
import * as kiosk from "@/utils/kiosk";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminScreen() {
  const { isAdminAuthenticated, enabledApps, isKioskEnabled, setKioskEnabled } =
    useLauncher();

  const [isDeviceOwner, setIsDeviceOwner] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isKioskBusy, setIsKioskBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) {
        router.replace("/");
        return;
      }
      // Query live kiosk state from native module
      kiosk.isDeviceOwner().then(setIsDeviceOwner).catch(() => {});
      kiosk.isInLockTaskMode().then(setIsLocked).catch(() => {});
    }, [isAdminAuthenticated])
  );

  // Keep lock state in sync
  useEffect(() => {
    setIsLocked(isKioskEnabled);
  }, [isKioskEnabled]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  // Both handlers guard on `isKioskBusy` so a double-tap (or tapping while a
  // previous toggle is still in flight) can never fire two overlapping native
  // calls. kiosk.startKioskMode/stopKioskMode are internally timeout-guarded
  // (see utils/kiosk.ts), so this await can never hang the admin screen.
  const handleEnableKiosk = useCallback(() => {
    if (isKioskBusy) return;
    Alert.alert(
      "Enable Kiosk Mode",
      "This will lock the device to the OCS OORJA Launcher. Only the admin can exit kiosk mode.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            if (isKioskBusy) return;
            setIsKioskBusy(true);
            try {
              const allowedPkgs = CURATED_APPS
                .filter((a) => enabledApps.includes(a.id) && a.packageName)
                .map((a) => a.packageName);

              await kiosk.startKioskMode(allowedPkgs);
              await setKioskEnabled(true);
              const locked = await kiosk.isInLockTaskMode();
              setIsLocked(locked);
            } finally {
              setIsKioskBusy(false);
            }
          },
        },
      ]
    );
  }, [enabledApps, setKioskEnabled, isKioskBusy]);

  const handleExitKiosk = useCallback(() => {
    if (isKioskBusy) return;
    Alert.alert(
      "Exit Kiosk Mode",
      "The device will leave kiosk mode and become freely accessible until an admin re-enables it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit Kiosk",
          style: "destructive",
          onPress: async () => {
            if (isKioskBusy) return;
            setIsKioskBusy(true);
            try {
              await kiosk.stopKioskMode();
              await setKioskEnabled(false);
              setIsLocked(false);
            } finally {
              setIsKioskBusy(false);
            }
          },
        },
      ]
    );
  }, [setKioskEnabled, isKioskBusy]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const statusColor = isDeviceOwner ? "#4ADE80" : "#FBBF24";
  const statusLabel = isDeviceOwner
    ? "Device Owner — Full Kiosk"
    : "No Device Owner — Screen Pin only";

  const kioskBgColor = isKioskEnabled ? "#1A3A1A" : "#3A1A1A";
  const kioskIcon = isKioskEnabled ? "lock" : "unlock";
  const kioskLabel = isKioskEnabled ? "Exit Kiosk Mode" : "Enable Kiosk Mode";
  const kioskSub = isKioskEnabled
    ? "Admin only — unlocks device for maintenance"
    : "Re-lock device to OCS OORJA Launcher";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#071A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <Text style={styles.title}>Admin</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/")}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Device owner / kiosk status banner */}
        <View style={styles.statusBanner}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
          {isLocked && (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={11} color="#4ADE80" />
              <Text style={styles.lockedBadgeText}>ACTIVE</Text>
            </View>
          )}
        </View>

        {!isDeviceOwner && (
          <View style={styles.doWarning}>
            <Feather name="alert-triangle" size={14} color="#FBBF24" />
            <Text style={styles.doWarningText}>
              Run once via IT admin:{"\n"}
              <Text style={styles.doCode}>
                adb shell dpm set-device-owner in.ocs.oorja.launcher/.KioskAdminReceiver
              </Text>
            </Text>
          </View>
        )}

        <View style={styles.menu}>
          {/* Kiosk Mode toggle */}
          <TouchableOpacity
            style={[styles.row, isKioskBusy && styles.rowDisabled]}
            onPress={isKioskEnabled ? handleExitKiosk : handleEnableKiosk}
            activeOpacity={0.75}
            disabled={isKioskBusy}
          >
            <View style={[styles.iconBox, { backgroundColor: kioskBgColor }]}>
              <Feather name={kioskIcon as never} size={22} color="#FFFFFF" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{kioskLabel}</Text>
              <Text style={styles.rowSub}>{kioskSub}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          {/* Wallpaper */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/admin/wallpaper")}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: "#1C3B6A" }]}>
              <Feather name="image" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Wallpaper</Text>
              <Text style={styles.rowSub}>Set the launcher background image</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          {/* Allowed Apps */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/admin/apps")}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: "#1A4A2A" }]}>
              <Feather name="grid" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Allowed Apps</Text>
              <Text style={styles.rowSub}>Choose which apps appear on the home screen</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  doneBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  lockedBadgeText: {
    color: "#4ADE80",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },

  doWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "rgba(251,191,36,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
    padding: 12,
  },
  doWarningText: {
    flex: 1,
    color: "rgba(251,191,36,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  doCode: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 11,
    color: "#FBBF24",
  },

  menu: { padding: 16, gap: 12, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  rowDisabled: { opacity: 0.5 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
