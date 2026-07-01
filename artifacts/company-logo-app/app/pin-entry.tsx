import { useApp } from "@/context/AppContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
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

function PinDots({ filled }: { filled: number }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

export default function PinEntryScreen() {
  const { verifyPin } = useApp();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (key === "") return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (key === "⌫") {
      setInput((prev) => prev.slice(0, -1));
      setError("");
      return;
    }

    if (input.length >= 4) return;
    const next = input + key;
    setInput(next);

    if (next.length === 4) {
      setTimeout(() => {
        if (verifyPin(next)) {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.replace("/settings");
        } else {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          shake();
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(
            newAttempts >= 3
              ? `Incorrect PIN. ${newAttempts} failed attempts.`
              : "Incorrect PIN. Try again."
          );
          setInput("");
        }
      }, 200);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#060910", "#0D1B2A"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Enter PIN</Text>
          <Text style={styles.subtitle}>Enter your PIN to access settings</Text>
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
              <Text style={[styles.keyText, key === "⌫" && styles.backspaceText]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060910" },
  safe: { flex: 1 },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 20,
    marginTop: Platform.OS === "web" ? 67 : 0,
  },
  closeText: { color: "rgba(255,255,255,0.5)", fontSize: 20 },
  header: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  error: {
    color: "#EF4444",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
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
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  keyEmpty: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  keyText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Inter_400Regular",
  },
  backspaceText: {
    fontSize: 20,
  },
});
