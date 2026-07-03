import { useLauncher } from "@/context/LauncherContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
const PIN_LENGTH = 6;

function PinDots({ filled }: { filled: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

export default function PinSetupScreen() {
  const { setupPin, setAdminAuthenticated } = useLauncher();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [error, setError] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pendingTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      pendingTimers.current.forEach(clearTimeout);
      pendingTimers.current = [];
    };
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (key === "") return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === "⌫") {
      setCurrentInput((prev) => prev.slice(0, -1));
      setError("");
      return;
    }

    if (currentInput.length >= PIN_LENGTH) return;
    const next = currentInput + key;
    setCurrentInput(next);

    if (next.length === PIN_LENGTH) {
      if (step === "create") {
        const t = setTimeout(() => {
          setFirstPin(next);
          setCurrentInput("");
          setStep("confirm");
        }, 300);
        pendingTimers.current.push(t);
      } else {
        if (next === firstPin) {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setupPin(next).then(() => {
            setAdminAuthenticated(true);
            router.replace("/admin");
          });
        } else {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shake();
          setError("PINs don't match. Try again.");
          setCurrentInput("");
          const t = setTimeout(() => {
            setStep("create");
            setFirstPin("");
            setError("");
          }, 1500);
          pendingTimers.current.push(t);
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0A2410"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{step === "create" ? "Create PIN" : "Confirm PIN"}</Text>
          <Text style={styles.subtitle}>
            {step === "create"
              ? "Set a 6-digit PIN to protect admin access"
              : "Re-enter your 6-digit PIN to confirm"}
          </Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <PinDots filled={currentInput.length} />
          </Animated.View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
              <Text style={[styles.keyText, key === "⌫" && styles.backspaceText]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071A0A" },
  safe: { flex: 1 },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 20,
    marginTop: Platform.OS === "web" ? 67 : 0,
  },
  closeText: { color: "rgba(255,255,255,0.5)", fontSize: 20 },
  header: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 20 },
  title: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  dotsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "#3A8B3F", borderColor: "#3A8B3F" },
  error: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "web" ? 34 : 20,
    gap: 12,
    justifyContent: "center",
  },
  keyBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(58,139,63,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(58,139,63,0.2)",
  },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_400Regular" },
  backspaceText: { fontSize: 20 },
});
