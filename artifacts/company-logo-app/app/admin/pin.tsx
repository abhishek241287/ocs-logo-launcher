import { useLauncher } from "@/context/LauncherContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
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

type Step = "current" | "new" | "confirm";

function PinDots({ filled }: { filled: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

export default function ChangePinScreen() {
  const { verifyPin, setupPin, isAdminAuthenticated } = useLauncher();
  const [step, setStep] = useState<Step>("current");
  const [input, setInput] = useState("");
  const [newPinValue, setNewPinValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

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

    if (key === "⌫") { setInput((p) => p.slice(0, -1)); setError(""); return; }
    if (input.length >= PIN_LENGTH) return;
    const next = input + key;
    setInput(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (step === "current") {
          if (verifyPin(next)) { setInput(""); setStep("new"); setError(""); }
          else { shake(); setError("Incorrect current PIN"); setInput(""); if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
        } else if (step === "new") {
          setNewPinValue(next); setInput(""); setStep("confirm"); setError("");
        } else {
          if (next === newPinValue) {
            setupPin(next).then(() => {
              setSuccess(true); setInput(""); setStep("current");
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(() => setSuccess(false), 3000);
            });
          } else {
            shake(); setError("PINs don't match. Start over."); setInput("");
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => { setStep("current"); setNewPinValue(""); setError(""); }, 1500);
          }
        }
      }, 200);
    }
  };

  const titles: Record<Step, string> = { current: "Enter Current PIN", new: "Enter New PIN", confirm: "Confirm New PIN" };
  const subs: Record<Step, string> = { current: "Verify your identity first", new: "Choose a new 6-digit PIN", confirm: "Re-enter your new PIN" };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          {success && <View style={styles.successBanner}><Text style={styles.successText}>✓ PIN changed successfully</Text></View>}
          <Text style={styles.title}>{titles[step]}</Text>
          <Text style={styles.subtitle}>{subs[step]}</Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <PinDots filled={input.length} />
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
  closeBtn: { alignSelf: "flex-end", padding: 20, marginTop: Platform.OS === "web" ? 67 : 0 },
  closeText: { color: "rgba(255,255,255,0.5)", fontSize: 20 },
  header: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 20, paddingHorizontal: 20 },
  successBanner: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", padding: 12, marginBottom: 24, width: "100%" },
  successText: { color: "#22C55E", fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" },
  title: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_600SemiBold", marginBottom: 10, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 40, textAlign: "center" },
  dotsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: "#3A8B3F", borderColor: "#3A8B3F" },
  error: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
  keypad: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 40, paddingBottom: Platform.OS === "web" ? 34 : 20, gap: 12, justifyContent: "center" },
  keyBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(58,139,63,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(58,139,63,0.2)" },
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_400Regular" },
  backspaceText: { fontSize: 20 },
});
