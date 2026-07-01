import { CURATED_APPS, type AppDef, useLauncher } from "@/context/LauncherContext";
import { addLaunchEntry } from "@/utils/launchLog";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef } from "react";
import {
  Alert,
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

async function launchApp(app: AppDef): Promise<void> {
  const { name, packageName, intentAction } = app;

  if (Platform.OS !== "android") {
    Alert.alert("Android only", "App launching works only on an Android device.");
    return;
  }

  const action = intentAction ?? "android.intent.action.MAIN";
  const params = intentAction ? {} : { packageName };

  console.log(`[OCS Launch] Attempting: ${name}`);
  console.log(`  Action:  ${action}`);
  console.log(`  Package: ${packageName}`);

  try {
    await IntentLauncher.startActivityAsync(action, params);
    console.log(`[OCS Launch] Success: ${name}`);
    addLaunchEntry({
      appName: name,
      packageName,
      intent: action,
      status: "success",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[OCS Launch] FAILED: ${name}`);
    console.error(`  Action:  ${action}`);
    console.error(`  Package: ${packageName}`);
    console.error(`  Error:   ${error.message}`);
    if (error.stack) console.error(`  Stack:   ${error.stack}`);

    addLaunchEntry({
      appName: name,
      packageName,
      intent: action,
      status: "failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    Alert.alert(
      "App not installed",
      `${name} could not be launched.\n\n${error.message}`
    );
  }
}

function AppIcon({ app }: { app: AppDef }) {
  return (
    <TouchableOpacity
      style={styles.appIconWrap}
      onPress={() => launchApp(app)}
      activeOpacity={0.75}
    >
      <View style={[styles.appIconBg, { backgroundColor: app.color + "33" }]}>
        {app.iconLib === "FontAwesome" ? (
          <FontAwesome name={app.icon as never} size={30} color={app.color} />
        ) : (
          <Feather name={app.icon as never} size={30} color={app.color} />
        )}
      </View>
      <Text style={styles.appIconLabel} numberOfLines={1}>
        {app.name}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { isPinSet, isLoading, wallpaperUri, enabledApps, setAdminAuthenticated } =
    useLauncher();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const visibleApps = CURATED_APPS.filter((a) => enabledApps.includes(a.id));

  const content = (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" hidden={Platform.OS !== "web"} />
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
          <Text style={styles.logoHint}>Tap logo 5× to access admin</Text>
        </View>

        <View style={styles.appsSection}>
          <View style={styles.appsHeader}>
            <Text style={styles.appsLabel}>APPS</Text>
          </View>
          <ScrollView
            contentContainerStyle={styles.appsGrid}
            showsVerticalScrollIndicator={false}
          >
            {visibleApps.map((app) => (
              <AppIcon key={app.id} app={app} />
            ))}
            {visibleApps.length === 0 && (
              <Text style={styles.noApps}>
                No apps enabled. Tap logo 5× → Admin → Apps.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );

  if (wallpaperUri) {
    return (
      <ImageBackground
        source={{ uri: wallpaperUri }}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        {content}
      </ImageBackground>
    );
  }

  return <View style={styles.bgSolid}>{content}</View>;
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgSolid: { flex: 1, backgroundColor: "#0A1628" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  safe: { flex: 1 },
  inner: { flex: 1 },
  heroSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoTouch: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 8,
    elevation: 8,
  },
  logo: { width: 120, height: 120 },
  logoHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  appsSection: { flex: 1, paddingHorizontal: 16 },
  appsHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 14,
  },
  appsLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  appsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingBottom: 24,
  },
  appIconWrap: { width: 72, alignItems: "center", gap: 6 },
  appIconBg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  appIconLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  noApps: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 24,
    lineHeight: 20,
  },
});
