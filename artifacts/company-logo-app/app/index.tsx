import { APP_VERSION, useLauncher } from "@/context/LauncherContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Battery from "expo-battery";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    Battery.getBatteryLevelAsync().then((l) => setLevel(Math.round(l * 100))).catch(() => {});
    Battery.getBatteryStateAsync().then((s) => setCharging(s === Battery.BatteryState.CHARGING)).catch(() => {});
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) =>
      setLevel(Math.round(batteryLevel * 100))
    );
    return () => sub.remove();
  }, []);
  return { level, charging };
}

function useWifi() {
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    if (Platform.OS === "web") return;
    Network.getNetworkStateAsync()
      .then((s) => setConnected(!!s.isConnected))
      .catch(() => {});
  }, []);
  return connected;
}

const APP_ICON_MAP: Record<string, { lib: "Feather" | "MaterialCommunityIcons"; name: string }> = {
  briefcase: { lib: "Feather", name: "briefcase" },
  camera: { lib: "Feather", name: "camera" },
  folder: { lib: "Feather", name: "folder" },
  calculator: { lib: "MaterialCommunityIcons", name: "calculator" },
  settings: { lib: "Feather", name: "settings" },
  globe: { lib: "Feather", name: "globe" },
  mail: { lib: "Feather", name: "mail" },
  "map-pin": { lib: "Feather", name: "map-pin" },
  "shopping-bag": { lib: "Feather", name: "shopping-bag" },
  youtube: { lib: "Feather", name: "youtube" },
  image: { lib: "Feather", name: "image" },
  users: { lib: "Feather", name: "users" },
  phone: { lib: "Feather", name: "phone" },
  "message-square": { lib: "Feather", name: "message-square" },
  clock: { lib: "Feather", name: "clock" },
  "hard-drive": { lib: "Feather", name: "hard-drive" },
};

function AppIcon({ icon, name }: { icon: string; name: string }) {
  const def = APP_ICON_MAP[icon] ?? { lib: "Feather", name: "grid" };
  return (
    <View style={styles.appIconWrap}>
      <View style={styles.appIconBg}>
        {def.lib === "Feather" ? (
          <Feather name={def.name as never} size={28} color="#FFFFFF" />
        ) : (
          <MaterialCommunityIcons name={def.name as never} size={28} color="#FFFFFF" />
        )}
      </View>
      <Text style={styles.appIconLabel} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const BOOT_DURATION = 2200;
const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 2500;

export default function HomeScreen() {
  const { config, isPinSet, isLoading, setAdminAuthenticated } = useLauncher();
  const now = useDateTime();
  const { level: batteryLevel, charging } = useBattery();
  const isWifiConnected = useWifi();

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bootOpacity = useRef(new Animated.Value(1)).current;
  const bootScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [bootDone, setBootDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setAdminAuthenticated(false);
    }, [setAdminAuthenticated])
  );

  useEffect(() => {
    const bootAnim = Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(bootScale, { toValue: 1.08, useNativeDriver: true, tension: 60, friction: 8 }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(bootOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(bootScale, { toValue: 0.85, duration: 500, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]);
    bootAnim.start(() => setBootDone(true));
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.045, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 3200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const enabledApps = config.visibleApps.filter((a) => a.enabled);

  const handleLogoTap = () => {
    tapCount.current += 1;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= SECRET_TAPS) {
      tapCount.current = 0;
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isLoading) return;
      if (isPinSet) {
        router.push("/pin-entry");
      } else {
        router.push("/pin-setup");
      }
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);
  };

  const accent = config.accentColor;

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <StatusBar style="light" hidden={Platform.OS !== "web"} />
      <View style={[styles.topGlow, { backgroundColor: accent }]} />

      {!bootDone && (
        <Animated.View
          style={[
            styles.bootScreen,
            { backgroundColor: config.backgroundColor, opacity: bootOpacity, transform: [{ scale: bootScale }] },
          ]}
          pointerEvents="none"
        >
          <Image
            source={config.logoSource === "custom" && config.customLogoUri
              ? { uri: config.customLogoUri }
              : require("../assets/images/ocs-logo.jpg")}
            style={styles.bootLogo}
            resizeMode="contain"
          />
          <Text style={[styles.bootTitle, { color: "#FFFFFF" }]}>{config.companyName}</Text>
          {config.customerName ? (
            <Text style={styles.bootCustomer}>Installed for {config.customerName}</Text>
          ) : null}
          <Text style={styles.bootTagline}>POWERED BY OCS OORJA</Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.mainContent, { opacity: contentOpacity }]}>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.statusBar, Platform.OS === "web" && { marginTop: 67 }]}>
            <Text style={styles.statusTime}>{timeStr}</Text>
            <View style={styles.statusRight}>
              <Feather
                name={isWifiConnected ? "wifi" : "wifi-off"}
                size={16}
                color="rgba(255,255,255,0.7)"
              />
              {batteryLevel !== null && (
                <View style={styles.batteryRow}>
                  <Feather
                    name={charging ? "battery-charging" : "battery"}
                    size={16}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text style={styles.batteryText}>{batteryLevel}%</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.heroSection}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogoTap}
              style={styles.logoTouchable}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {config.logoSource === "custom" && config.customLogoUri ? (
                  <Image source={{ uri: config.customLogoUri }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <Image source={require("../assets/images/ocs-logo.jpg")} style={styles.logo} resizeMode="contain" />
                )}
              </Animated.View>
            </TouchableOpacity>

            <Text style={[styles.companyName, { color: "#FFFFFF" }]}>{config.companyName}</Text>
            {config.customerName ? (
              <View style={styles.customerBadge}>
                <Text style={styles.customerLabel}>Installed for</Text>
                <Text style={styles.customerName}>{config.customerName}</Text>
              </View>
            ) : null}
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>

          <View style={styles.appsSection}>
            <View style={[styles.appsDivider, { backgroundColor: accent }]} />
            <Text style={styles.appsLabel}>APPLICATIONS</Text>
            <ScrollView
              contentContainerStyle={styles.appsGrid}
              showsVerticalScrollIndicator={false}
            >
              {enabledApps.map((app) => (
                <AppIcon key={app.id} icon={app.icon} name={app.name} />
              ))}
              {enabledApps.length === 0 && (
                <Text style={styles.noAppsText}>No apps enabled. Contact your administrator.</Text>
              )}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerPowered}>Powered by OCS OORJA</Text>
            <Text style={styles.footerVersion}>v{APP_VERSION}{config.deviceName ? ` · ${config.deviceName}` : ""}</Text>
            {config.supportNumber ? (
              <Text style={styles.footerSupport}>Support: {config.supportNumber}</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    position: "absolute", top: -100, left: "50%", marginLeft: -160,
    width: 320, height: 320, borderRadius: 160, opacity: 0.07,
  },
  bootScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    gap: 14,
  },
  bootLogo: { width: 160, height: 160, borderRadius: 24 },
  bootTitle: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  bootCustomer: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontFamily: "Inter_400Regular" },
  bootTagline: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2.5 },
  mainContent: { flex: 1 },
  safe: { flex: 1 },
  statusBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  statusTime: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_500Medium" },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  batteryText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  heroSection: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 10 },
  logoTouchable: {
    width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  logo: { width: 148, height: 148, borderRadius: 22 },
  companyName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 6 },
  customerBadge: { alignItems: "center", marginBottom: 10 },
  customerLabel: { color: "rgba(255,255,255,0.32)", fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  customerName: { color: "rgba(255,255,255,0.65)", fontSize: 14, fontFamily: "Inter_500Medium" },
  dateText: { color: "rgba(255,255,255,0.42)", fontSize: 13, fontFamily: "Inter_400Regular" },
  appsSection: { flex: 1, paddingHorizontal: 16, paddingBottom: 4 },
  appsDivider: { height: 2, borderRadius: 1, marginBottom: 12, opacity: 0.5 },
  appsLabel: { color: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  appsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-start", paddingBottom: 8 },
  appIconWrap: { width: 76, alignItems: "center", gap: 6 },
  appIconBg: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  appIconLabel: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  noAppsText: { color: "rgba(255,255,255,0.28)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20, marginTop: 20 },
  footer: {
    alignItems: "center",
    paddingBottom: Platform.OS === "web" ? 30 : 14,
    paddingTop: 6,
    gap: 3,
  },
  footerPowered: { color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  footerVersion: { color: "rgba(255,255,255,0.15)", fontSize: 10, fontFamily: "Inter_400Regular" },
  footerSupport: { color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "Inter_400Regular" },
});
