import { CURATED_APPS, useLauncher } from "@/context/LauncherContext";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef } from "react";
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

async function launchApp(packageName: string, appName: string) {
  if (Platform.OS !== "android") {
    Alert.alert("Android only", "App launching works only on an Android device.");
    return;
  }
  try {
    await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
      packageName,
    });
  } catch {
    Alert.alert("App not installed", `${appName} is not installed on this device.`);
  }
}

function AppIcon({ id, name, packageName, icon, iconLib, color }: {
  id: string; name: string; packageName: string;
  icon: string; iconLib: "Feather" | "FontAwesome"; color: string;
}) {
  return (
    <TouchableOpacity
      style={styles.appIconWrap}
      onPress={() => launchApp(packageName, name)}
      activeOpacity={0.75}
    >
      <View style={[styles.appIconBg, { backgroundColor: color + "33" }]}>
        {iconLib === "FontAwesome" ? (
          <FontAwesome name={icon as never} size={30} color={color} />
        ) : (
          <Feather name={icon as never} size={30} color={color} />
        )}
      </View>
      <Text style={styles.appIconLabel} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { isPinSet, isLoading, wallpaperUri, enabledApps, setAdminAuthenticated } = useLauncher();
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
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, TAP_WINDOW_MS);
  };

  const visibleApps = CURATED_APPS.filter((a) => enabledApps.includes(a.id));

  const content = (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" hidden={Platform.OS !== "web"} />
      <View style={[styles.inner, Platform.OS === "web" && { paddingTop: 67 }]}>
        <View style={styles.heroSection}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.9} style={styles.logoTouch}>
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
          <ScrollView contentContainerStyle={styles.appsGrid} showsVerticalScrollIndicator={false}>
            {visibleApps.map((app) => (
              <AppIcon key={app.id} {...app} />
            ))}
            {visibleApps.length === 0 && (
              <Text style={styles.noApps}>No apps enabled. Tap logo 5× → Admin → Apps.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );

  if (wallpaperUri) {
    return (
      <ImageBackground source={{ uri: wallpaperUri }} style={styles.bg} resizeMode="cover">
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
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
