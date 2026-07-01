import { CURATED_APPS, useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppsScreen() {
  const { isAdminAuthenticated, enabledApps, setEnabledApps } = useLauncher();
  const [localEnabled, setLocalEnabled] = useState<string[]>(enabledApps);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const toggleApp = useCallback(
    async (id: string, value: boolean) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      const next = value
        ? [...localEnabled, id]
        : localEnabled.filter((a) => a !== id);
      setLocalEnabled(next);
      await setEnabledApps(next);
    },
    [localEnabled, setEnabledApps]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#071A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Admin</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Allowed Apps</Text>
          <View style={{ width: 80 }} />
        </View>

        <Text style={styles.hint}>
          Toggle apps to show or hide them on the home screen.
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
          {CURATED_APPS.map((app) => {
            const isEnabled = localEnabled.includes(app.id);
            return (
              <View key={app.id} style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: app.color + "33" }]}>
                  {app.iconLib === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons
                      name={app.icon as never}
                      size={24}
                      color={app.color}
                    />
                  ) : (
                    <MaterialIcons
                      name={app.icon as never}
                      size={24}
                      color={app.color}
                    />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{app.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {app.packageName}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={(val) => toggleApp(app.id, val)}
                  trackColor={{ false: "rgba(255,255,255,0.1)", true: "#4A90E2" }}
                  thumbColor={isEnabled ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                />
              </View>
            );
          })}
        </ScrollView>
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
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  scroll: { flex: 1 },
  list: { padding: 12, gap: 8, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
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
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowSub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
