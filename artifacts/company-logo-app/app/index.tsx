import { CURATED_APPS, type AppDef, useLauncher } from "@/context/LauncherContext";
import * as kiosk from "@/utils/kiosk";
import { addLaunchEntry } from "@/utils/launchLog";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 3000;
const INTENT_TIMEOUT_MS = 4000;

/** Rejects after `ms` if `promise` hasn't settled — guarantees callers never hang. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("E_TIMEOUT")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

const IS_EXPO_GO =
  (Constants.appOwnership as string | null) === "expo" ||
  (Constants as unknown as Record<string, string>).executionEnvironment ===
    "storeClient";

const EXPO_VERSION: string =
  (Constants as unknown as Record<string, string>).expoVersion ??
  Constants.nativeAppVersion ??
  "unknown";

const SDK_VERSION: number | string =
  Platform.OS === "android" ? Platform.Version : Platform.OS;

// Module-level concurrency guard
let isLaunching = false;
let lastLaunchTime = 0;
const LAUNCH_DEBOUNCE_MS = 500;

function showNotInstalledToast() {
  if (Platform.OS === "android") {
    ToastAndroid.show("Application not installed.", ToastAndroid.SHORT);
  }
}

/**
 * Launch an allowed app.
 *
 * Package-based apps (Chrome, YouTube, …) use the native KioskModule.launchApp()
 * which calls PackageManager.getLaunchIntentForPackage() with a null check, and
 * activity.startActivity() — the Android-recommended path, and the only one that
 * works correctly when the launcher is in kiosk / immersive mode.
 *
 * Action-based apps (Camera) use expo-intent-launcher with the raw action because
 * they have no single package name to look up.
 *
 * Every path is wrapped in a timeout (see kiosk.launchApp / withTimeout below) so
 * a stuck native or intent call can never freeze the launcher UI — the debounce
 * guard is always released in `finally`.
 *
 * In Device Owner mode the lock-task whitelist enforces the allowlist at the OS
 * level; this JS-side check is a defense-in-depth layer so hidden apps never
 * receive a launch call regardless.
 */
async function launchApp(app: AppDef, enabledApps: string[]): Promise<void> {
  if (!enabledApps.includes(app.id)) return;

  const now = Date.now();
  if (isLaunching || now - lastLaunchTime < LAUNCH_DEBOUNCE_MS) return;

  const { name, packageName, intentAction } = app;
  const isActionIntent = !!intentAction;

  if (Platform.OS !== "android") {
    addLaunchEntry({
      appName: name,
      packageName,
      intent: intentAction ?? "getLaunchIntentForPackage",
      flags: "none (non-Android)",
      status: "skipped",
      sdkVersion: SDK_VERSION,
      expoVersion: EXPO_VERSION,
      isExpoGo: IS_EXPO_GO,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  isLaunching = true;
  lastLaunchTime = now;

  try {
    if (isActionIntent) {
      // Camera and other pure-action intents — no package name to look up.
      // Wrapped in a timeout so a stuck intent resolver can never freeze the UI.
      try {
        await withTimeout(IntentLauncher.startActivityAsync(intentAction, {}), INTENT_TIMEOUT_MS);
        addLaunchEntry({
          appName: name,
          packageName,
          intent: intentAction,
          flags: "action",
          status: "success",
          sdkVersion: SDK_VERSION,
          expoVersion: EXPO_VERSION,
          isExpoGo: IS_EXPO_GO,
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const isNotInstalled =
          error.message.includes("ActivityNotFoundException") ||
          error.message.includes("No Activity found") ||
          error.message.includes("No activity found");
        if (isNotInstalled) showNotInstalledToast();
        addLaunchEntry({
          appName: name,
          packageName,
          intent: intentAction,
          flags: "action",
          status: "failed",
          error: isNotInstalled ? `Not installed: ${name}` : error.message,
          errorStack: error.stack,
          sdkVersion: SDK_VERSION,
          expoVersion: EXPO_VERSION,
          isExpoGo: IS_EXPO_GO,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    // Package-based apps — native getLaunchIntentForPackage(), never throws,
    // never hangs (internally timeout-guarded); always resolves a LaunchResult.
    const result = await kiosk.launchApp(packageName);

    if (result.ok) {
      addLaunchEntry({
        appName: name,
        packageName,
        intent: "getLaunchIntentForPackage",
        flags: "getLaunchIntentForPackage+NEW_TASK",
        status: "success",
        sdkVersion: SDK_VERSION,
        expoVersion: EXPO_VERSION,
        isExpoGo: IS_EXPO_GO,
        timestamp: new Date().toISOString(),
      });
    } else {
      if (result.reason === "not_installed") showNotInstalledToast();
      addLaunchEntry({
        appName: name,
        packageName,
        intent: "getLaunchIntentForPackage",
        flags: "getLaunchIntentForPackage+NEW_TASK",
        status: "failed",
        error:
          result.reason === "not_installed"
            ? `Not installed: ${packageName}`
            : result.message ?? result.reason,
        sdkVersion: SDK_VERSION,
        expoVersion: EXPO_VERSION,
        isExpoGo: IS_EXPO_GO,
        timestamp: new Date().toISOString(),
      });
    }
  } finally {
    isLaunching = false;
  }
}

const CARD_SIZE = (Dimensions.get("window").width - 32 - 24) / 3;

function AppCard({ app, enabledApps }: { app: AppDef; enabledApps: string[] }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => launchApp(app, enabledApps)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardIconBg, { backgroundColor: app.color + "18" }]}>
        {app.iconLib === "MaterialCommunityIcons" ? (
          <MaterialCommunityIcons name={app.icon as never} size={28} color={app.color} />
        ) : (
          <MaterialIcons name={app.icon as never} size={28} color={app.color} />
        )}
      </View>
      <Text style={styles.cardLabel} numberOfLines={1}>
        {app.name}
      </Text>
    </TouchableOpacity>
  );
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function HomeScreen() {
  const {
    isPinSet,
    isLoading,
    wallpaperUri,
    enabledApps,
    isKioskEnabled,
    setAdminAuthenticated,
  } = useLauncher();

  const tapTimestamps = useRef<number[]>([]);
  const isNavigatingToAdmin = useRef(false);
  const pendingAdminNav = useRef(false);
  const now = useClock();

  // -------------------------------------------------------------------------
  // Kiosk startup
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading || !isKioskEnabled) return;

    // Collect package names of currently enabled apps (exclude empty strings)
    const allowedPkgs = CURATED_APPS
      .filter((a) => enabledApps.includes(a.id) && a.packageName)
      .map((a) => a.packageName);

    kiosk.startKioskMode(allowedPkgs).catch(() => {});
  }, [isLoading, isKioskEnabled]); // intentionally excludes enabledApps — run once on boot

  // -------------------------------------------------------------------------
  // Block hardware back button — always
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // -------------------------------------------------------------------------
  // Re-apply immersive mode whenever app regains foreground
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isKioskEnabled) {
        kiosk.enableImmersiveMode().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [isKioskEnabled]);

  // -------------------------------------------------------------------------
  // Screen focus: reset admin auth + re-apply immersive
  // -------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      setAdminAuthenticated(false);
      // Screen regained focus (e.g. returning from pin-entry/pin-setup) —
      // clear the navigation debounce and any stale taps so the gesture
      // works again immediately.
      isNavigatingToAdmin.current = false;
      pendingAdminNav.current = false;
      tapTimestamps.current = [];
      if (isKioskEnabled) {
        kiosk.enableImmersiveMode().catch(() => {});
      }
    }, [setAdminAuthenticated, isKioskEnabled])
  );

  // -------------------------------------------------------------------------
  // Secret logo tap → admin
  //
  // Sliding-window tap detector: keeps only tap timestamps from the last
  // TAP_WINDOW_MS. Fires exactly once per 5-tap burst — `isNavigatingToAdmin`
  // debounces any further taps until the screen is refocused, so rapid
  // repeated taps can never open the PIN screen twice or double-navigate.
  // No timers are used, so there is nothing that can leak or freeze.
  // -------------------------------------------------------------------------
  const handleLogoTap = () => {
    if (isNavigatingToAdmin.current) return;

    const now = Date.now();
    tapTimestamps.current = [...tapTimestamps.current, now].filter(
      (t) => now - t <= TAP_WINDOW_MS
    );

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (tapTimestamps.current.length >= SECRET_TAPS) {
      tapTimestamps.current = [];
      isNavigatingToAdmin.current = true;
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (isLoading) {
        // Context data (PIN / kiosk state) hasn't finished loading from
        // AsyncStorage yet — defer the navigation instead of dropping it.
        // The effect below fires it as soon as loading completes, so a fast
        // cold-start tap burst is never silently swallowed or left stuck.
        pendingAdminNav.current = true;
      } else {
        router.push(isPinSet ? "/pin-entry" : "/pin-setup");
      }
    }
  };

  // Fires a deferred admin navigation (see handleLogoTap) once loading
  // finishes, and resets the debounce if it doesn't fire.
  useEffect(() => {
    if (!isLoading && pendingAdminNav.current) {
      pendingAdminNav.current = false;
      router.push(isPinSet ? "/pin-entry" : "/pin-setup");
    }
  }, [isLoading, isPinSet]);

  const visibleApps = CURATED_APPS.filter((a) => enabledApps.includes(a.id));

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={wallpaperUri ? "light" : "dark"} hidden={isKioskEnabled} />
      <View style={[styles.inner, Platform.OS === "web" && { paddingTop: 67 }]}>

        <View style={styles.heroSection}>
          <TouchableOpacity
            onPress={handleLogoTap}
            activeOpacity={0.9}
            style={styles.logoTouch}
          >
            <Image
              source={require("../assets/images/ocs-logo.jpg")}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={[styles.tagline, wallpaperUri && styles.taglineOnWallpaper]}>
            Powering Green Future
          </Text>
          <Text style={[styles.dateText, wallpaperUri && styles.textOnWallpaper]}>
            {dateStr}
          </Text>
          <Text style={[styles.timeText, wallpaperUri && styles.timeOnWallpaper]}>
            {timeStr}
          </Text>
        </View>

        <View style={styles.appsSection}>
          <Text style={[styles.appsLabel, wallpaperUri && styles.appsLabelOnWallpaper]}>
            APPS
          </Text>
          <ScrollView
            contentContainerStyle={styles.appsGrid}
            showsVerticalScrollIndicator={false}
          >
            {visibleApps.map((app) => (
              <AppCard key={app.id} app={app} enabledApps={enabledApps} />
            ))}
            {visibleApps.length === 0 && (
              <Text style={[styles.noApps, wallpaperUri && styles.textOnWallpaper]}>
                No apps enabled.{"\n"}Tap logo 5× → Admin → Apps.
              </Text>
            )}
          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );

  if (wallpaperUri) {
    return (
      <ImageBackground source={{ uri: wallpaperUri }} style={styles.bg} resizeMode="cover">
        <View style={styles.wallpaperOverlay} />
        {content}
      </ImageBackground>
    );
  }

  return <View style={styles.bgLight}>{content}</View>;
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgLight: { flex: 1, backgroundColor: "#F7F9FC" },
  wallpaperOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  safe: { flex: 1 },
  inner: { flex: 1 },

  heroSection: { alignItems: "center", paddingTop: 36, paddingBottom: 20 },
  logoTouch: {
    width: 110,
    height: 110,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  logo: { width: 110, height: 110 },
  tagline: {
    color: "#0E9F6E",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  taglineOnWallpaper: {
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  dateText: {
    color: "#1F2937",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  timeText: { color: "#6B7280", fontSize: 13, fontFamily: "Inter_400Regular" },
  textOnWallpaper: {
    color: "#1F2937",
    textShadowColor: "rgba(255,255,255,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  timeOnWallpaper: {
    color: "#374151",
    textShadowColor: "rgba(255,255,255,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  appsSection: { flex: 1, paddingHorizontal: 16 },
  appsLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  appsLabelOnWallpaper: { color: "#374151" },
  appsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 24 },

  card: {
    width: CARD_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    color: "#1F2937",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },

  noApps: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 24,
    lineHeight: 22,
  },
});
