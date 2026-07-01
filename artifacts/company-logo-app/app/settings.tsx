import { useApp } from "@/context/AppContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
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

type ChangePinStep = "current" | "new" | "confirm";

export default function SettingsScreen() {
  const { setupPin, verifyPin } = useApp();
  const [showPinChange, setShowPinChange] = useState(false);
  const [changePinStep, setChangePinStep] = useState<ChangePinStep>("current");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);
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
      setPinInput((prev) => prev.slice(0, -1));
      setPinError("");
      return;
    }
    if (pinInput.length >= 4) return;
    const next = pinInput + key;
    setPinInput(next);

    if (next.length === 4) {
      setTimeout(() => {
        if (changePinStep === "current") {
          if (verifyPin(next)) {
            setPinInput("");
            setChangePinStep("new");
          } else {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            shake();
            setPinError("Incorrect current PIN");
            setPinInput("");
          }
        } else if (changePinStep === "new") {
          setNewPin(next);
          setPinInput("");
          setChangePinStep("confirm");
        } else {
          if (next === newPin) {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setupPin(next).then(() => {
              setPinSuccess(true);
              setShowPinChange(false);
              setChangePinStep("current");
              setPinInput("");
              setNewPin("");
              setPinError("");
              setTimeout(() => setPinSuccess(false), 3000);
            });
          } else {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            shake();
            setPinError("PINs don't match. Start over.");
            setPinInput("");
            setTimeout(() => {
              setChangePinStep("current");
              setNewPin("");
              setPinError("");
            }, 1500);
          }
        }
      }, 200);
    }
  };

  const stepTitle: Record<ChangePinStep, string> = {
    current: "Enter Current PIN",
    new: "Enter New PIN",
    confirm: "Confirm New PIN",
  };

  const stepSubtitle: Record<ChangePinStep, string> = {
    current: "Verify your identity first",
    new: "Choose a new 4-digit PIN",
    confirm: "Re-enter your new PIN",
  };

  if (showPinChange) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={["#060910", "#0D1B2A"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              setShowPinChange(false);
              setChangePinStep("current");
              setPinInput("");
              setPinError("");
            }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>{stepTitle[changePinStep]}</Text>
            <Text style={styles.subtitle}>{stepSubtitle[changePinStep]}</Text>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <PinDots filled={pinInput.length} />
            </Animated.View>
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#060910", "#0D1B2A"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <Text style={styles.screenTitle}>Settings</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/")}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {pinSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>PIN changed successfully</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>SECURITY</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowPinChange(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#1C3B6A" }]}>
                  <Text style={styles.rowIcon}>🔑</Text>
                </View>
                <View>
                  <Text style={styles.rowLabel}>Change PIN</Text>
                  <Text style={styles.rowSub}>Update your 4-digit security PIN</Text>
                </View>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>INFORMATION</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: "#1B3A2A" }]}>
                  <Text style={styles.rowIcon}>ℹ️</Text>
                </View>
                <View>
                  <Text style={styles.rowLabel}>How to use as Home Screen</Text>
                  <Text style={styles.rowSub}>
                    Android: Settings › Apps › Default Apps › Home App
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.hint}>
            This app displays your company logo full screen. Hold the logo for 3
            seconds to return to this settings screen.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060910" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  doneBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  successBanner: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  successText: {
    color: "#22C55E",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowLast: {},
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIcon: { fontSize: 18 },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    maxWidth: 220,
  },
  rowChevron: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 22,
    marginLeft: 8,
  },
  hint: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
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
  dotsRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "#4A90E2", borderColor: "#4A90E2" },
  errorText: {
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
  keyEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_400Regular" },
  backspaceText: { fontSize: 20 },
});
