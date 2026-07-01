import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LauncherProvider } from "@/context/LauncherContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pin-setup" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="pin-entry" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin/index" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin/apps" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/wallpaper" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/logo" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/appearance" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/pin" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/config" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/customer" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/device-info" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/updates" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin/security" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <LauncherProvider>
              <RootLayoutNav />
            </LauncherProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
