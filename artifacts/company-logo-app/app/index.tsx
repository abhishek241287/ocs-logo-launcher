import { CURATED_APPS, type AppDef, useLauncher } from "@/context/LauncherContext";
import { addLaunchEntry } from "@/utils/launchLog";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 2500;

const IS_EXPO_GO =
  (Constants.appOwnership as string | null) === "expo" ||
  (Constants as unknown as Record<string, string>).executionEnvironment === "storeClient";

const EXPO_VERSION: string =
  (Constants as unknown as Record<string, string>).expoVersion ??
  Constants.nativeAppVersion ??
  "unknown";

const SDK_VERSION: number | string =
  Platform.OS === "android" ? Platform.Version : Platform.OS;

// FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
const LAUNCHER_FLAGS = 0x10000000 | 0x00200000; // 270532608
const LAUNCHER_FLAGS_STR = `0x${LAUNCHER_FLAGS.toString(16).toUpperCase()} (FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)`;

// ─── Concurrency guard ────────────────────────────────────────────────────────
let isLaunching = false;
let lastLaunchTime = 0;
const LAUNCH_DEBOUNCE_MS = 500;

async function launchApp(app: AppDef): Promise<void> {
  const now = Date.now();
  if (isLaunching || now - lastLaunchTime < LAUNCH_DEBOUNCE_MS) return;

  const { name, packageName, intentAction } = app;
  const isActionIntent = !!intentAction;

  if (Platform.OS !== "android") {
    Alert.alert("Android only", "App launching works only on an Android device.");
    addLaunchEntry({
      appName: name,
      packageName,
      intent: intentAction ?? "android.intent.action.MAIN",
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

  // Package-based: packageName alone locks the intent to one specific app —
  // no "Open with" chooser. Action-based (Camera, Settings): no packageName needed.
  const action = intentAction ?? "android.intent.action.MAIN";
  const params = isActionIntent
    ? {}
    : { packageName, flags: LAUNCHER_FLAGS };
  const flagsStr = isActionIntent ? "none (action intent)" : LAUNCHER_FLAGS_STR;

  console.log("[OCS] ─────────────────────────────────────────────");
  console.log(`[OCS] App:         ${name}`);
  console.log(`[OCS] Package:     ${packageName}`);
  console.log(`[OCS] Action:      ${action}`);
  console.log(`[OCS] Flags:       ${flagsStr}`);
  console.log(`[OCS] Android SDK: API ${SDK_VERSION}`);
  console.log(`[OCS] Expo:        ${EXPO_VERSION}`);
  console.log(`[OCS] Context:     ${IS_EXPO_GO ? "Expo Go" : "Standalone APK"}`);
  console.log("[OCS] ─────────────────────────────────────────────");

  try {
    await IntentLauncher.startActivityAsync(action, params);
    console.log(`[OCS] ✓ Success: ${name}`);
    addLaunchEntry({
      appName: name,
      packageName,
      intent: action,
      flags: flagsStr,
      status: "success",
      sdkVersion: SDK_VERSION,
      expoVersion: EXPO_VERSION,
      isExpoGo: IS_EXPO_GO,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[OCS] ✗ Failed: ${name} — ${error.message}`);

    const isNotInstalled =
      error.message.includes("ActivityNotFoundException") ||
      error.message.includes("No Activity found") ||
      error.message.includes("No activity found") ||
      error.message.includes("Unable to find explicit activity");

    addLaunchEntry({
      appName: name,
      packageName,
      intent: action,
      flags: flagsStr,
      status: "failed",
      error: isNotInstalled ? `App not installed: ${packageName}` : error.message,
      errorStack: error.stack,
      sdkVersion: SDK_VERSION,
      expoVersion: EXPO_VERSION,
      isExpoGo: IS_EXPO_GO,
      timestamp: new Date().toISOString(),
    });

    Alert.alert(
      isNotInstalled ? "App not installed" : "Launch failed",
      isNotInstalled
        ? `${name} is not installed on this device.`
        : `${name} could not be opened.\n\n${error.message}`
    );
  } finally {
    isLaunching = false;
  }
}

const CARD_SIZE = (Dimensions.get("window").width - 32 - 24) / 3;

function AppCard({ app }: { app: AppDef }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => launchApp(app)}
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
  const { isPinSet, isLoading, wallpaperUri, enabledApps, customApps, setAdminAuthenticated } =
    useLauncher();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useClock();

  useFocusEffect(
    useCallback(() => {
      setAdminAuthenticated(false);
    }, [setAdminAuthenticated])
  );

  const handleLogoTap = () => {
    tapCount.current += 1;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= SECRET_TAPS) {
      tapCount.current = 0;
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (!isLoading) {
        router.push(isPinSet ? "/pin-entry" : "/pin-setup");
      }
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);
  };

  const allApps = [...CURATED_APPS, ...customApps];
  const visibleApps = allApps.filter((a) => enabledApps.includes(a.id));

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
      <StatusBar style={wallpaperUri ? "light" : "dark"} />
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
              <AppCard key={app.id} app={app} />
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

  heroSection: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 20,
  },
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
  timeText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
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
  appsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 24,
  },

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
