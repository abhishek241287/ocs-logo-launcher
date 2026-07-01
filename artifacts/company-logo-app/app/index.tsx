import { useApp } from "@/context/AppContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LogoScreen() {
  const { isPinSet, isLoading } = useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLongPress = () => {
    if (isLoading) return;
    if (isPinSet) {
      router.push("/pin-entry");
    } else {
      router.push("/pin-setup");
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={Platform.OS !== "web"} />
      <LinearGradient
        colors={["#060910", "#0D1B2A", "#060910"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[styles.glowRing, { opacity: glowOpacity }]}
        pointerEvents="none"
      />

      <TouchableOpacity
        activeOpacity={1}
        onLongPress={handleLongPress}
        delayLongPress={3000}
        style={styles.logoContainer}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.hint}>Hold logo for 3 seconds to access settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#060910",
  },
  glowRing: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "#4A90E2",
  },
  logoContainer: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 260,
    height: 260,
  },
  hint: {
    position: "absolute",
    bottom: 50,
    color: "rgba(255,255,255,0.15)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
});
