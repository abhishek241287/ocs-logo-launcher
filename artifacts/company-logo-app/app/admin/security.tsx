import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function PinDots({ filled }: { filled: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

type Mode = "none" | "exit" | "settings" | "reset";

export default function SecurityScreen() {
  const { verifyPin, isAdminAuthenticated } = useLauncher();
  const [mode, setMode] = useState<Mode>("none");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const startProtectedAction = (m: Mode) => {
    setMode(m);
    setInput("");
    setError("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleKey = (key: string) => {
    if (mode === "none" || key === "") return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === "⌫") { setInput((p) => p.slice(0, -1)); setError(""); return; }
    if (input.length >= PIN_LENGTH) return;
    const next = input + key;
    setInput(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (verifyPin(next)) {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          executeAction(mode);
          setMode("none");
          setInput("");
        } else {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shake();
          setError("Incorrect PIN");
          setInput("");
        }
      }, 200);
    }
  };

  const executeAction = (m: Mode) => {
    switch (m) {
      case "exit":
        router.replace("/");
        break;
      case "settings":
        if (Platform.OS === "android") {
          Alert.alert("Open Settings", "On a real device, Android Settings would open here.\n\nUse an IntentLauncher call in native build.", [{ text: "OK" }]);
        } else {
          Alert.alert("Open Settings", "Settings access requires a native Android build.", [{ text: "OK" }]);
        }
        break;
      case "reset":
        Alert.alert(
          "Factory Reset",
          "This would initiate a factory reset on a real device. This action is irreversible.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Reset", style: "destructive", onPress: () => {} },
          ]
        );
        break;
    }
  };

  const ACTIONS = [
    { id: "exit" as Mode, icon: "log-out", label: "Exit Launcher", sub: "Return to Android home", color: "#1A3A4A", danger: false },
    { id: "settings" as Mode, icon: "settings", label: "Open Android Settings", sub: "Access system settings", color: "#3A2A1A", danger: false },
    { id: "reset" as Mode, icon: "alert-triangle", label: "Factory Reset", sub: "Wipe device — irreversible", color: "#4A1A1A", danger: true },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => { setMode("none"); router.back(); }}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Factory Reset Protection</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {mode === "none" ? (
            <>
              <View style={styles.shieldCard}>
                <Feather name="shield" size={36} color="#3A8B3F" />
                <Text style={styles.shieldTitle}>PIN-Gated Actions</Text>
                <Text style={styles.shieldSub}>
                  The following actions require admin PIN verification before they can be executed.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>PROTECTED ACTIONS</Text>
              <View style={styles.card}>
                {ACTIONS.map((action, idx) => (
                  <TouchableOpacity
                    key={action.id}
                    style={[styles.actionRow, idx < ACTIONS.length - 1 && styles.rowBorder]}
                    onPress={() => startProtectedAction(action.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actionLeft}>
                      <View style={[styles.iconBox, { backgroundColor: action.color }]}>
                        <Feather name={action.icon as never} size={18} color={action.danger ? "#EF4444" : "#FFFFFF"} />
                      </View>
                      <View>
                        <Text style={[styles.actionLabel, action.danger && styles.dangerText]}>{action.label}</Text>
                        <Text style={styles.actionSub}>{action.sub}</Text>
                      </View>
                    </View>
                    <View style={styles.lockBadge}>
                      <Feather name="lock" size={12} color="rgba(255,255,255,0.3)" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Feather name="info" size={14} color="rgba(255,255,255,0.3)" />
                <Text style={styles.infoText}>
                  All sensitive operations require admin PIN verification. Factory reset on Android requires a native build with system permissions.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.pinArea}>
              <View style={styles.pinHeader}>
                <Text style={styles.pinTitle}>Confirm PIN</Text>
                <Text style={styles.pinSub}>
                  {mode === "exit" ? "Enter PIN to exit launcher" : mode === "settings" ? "Enter PIN to open Settings" : "Enter PIN to initiate factory reset"}
                </Text>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <PinDots filled={input.length} />
                </Animated.View>
                {error ? <Text style={styles.pinError}>{error}</Text> : null}
              </View>
              <View style={styles.keypad}>
                {KEYS.map((key, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.keyBtn, key === "" && styles.keyEmpty]}
                    onPress={() => handleKey(key)}
                    disabled={key === ""}
                    activeOpacity={key ? 0.6 : 1}
                  >
                    <Text style={[styles.keyText, key === "⌫" && styles.backText]}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => { setMode("none"); setInput(""); setError(""); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
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
  shieldCard: {
    backgroundColor: "rgba(58,139,63,0.08)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(58,139,63,0.2)", padding: 28, alignItems: "center", gap: 10, marginBottom: 24,
  },
  shieldTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  shieldSub: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerText: { color: "#EF4444" },
  actionSub: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lockBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  infoBox: {
    flexDirection: "row", gap: 10, marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14,
  },
  infoText: { color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  pinArea: { alignItems: "center", paddingTop: 20 },
  pinHeader: { alignItems: "center", marginBottom: 40 },
  pinTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  pinSub: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 30, textAlign: "center" },
  dotsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#3A8B3F", borderColor: "#3A8B3F" },
  pinError: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
  keypad: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", width: 300 },
  keyBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(58,139,63,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(58,139,63,0.2)" },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_400Regular" },
  backText: { fontSize: 20 },
  cancelText: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 24 },
});
