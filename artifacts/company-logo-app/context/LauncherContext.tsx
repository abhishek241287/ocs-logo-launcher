import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const PIN_KEY = "@ocs:pin";
const WALLPAPER_KEY = "@ocs:wallpaper";
const APPS_KEY = "@ocs:enabled_apps";

export interface AppDef {
  id: string;
  name: string;
  packageName: string;
  iconLib: "Feather" | "FontAwesome";
  icon: string;
  color: string;
}

export const CURATED_APPS: AppDef[] = [
  { id: "youtube", name: "YouTube", packageName: "com.google.android.youtube", iconLib: "FontAwesome", icon: "youtube-play", color: "#FF0000" },
  { id: "instagram", name: "Instagram", packageName: "com.instagram.android", iconLib: "FontAwesome", icon: "instagram", color: "#C13584" },
  { id: "whatsapp", name: "WhatsApp", packageName: "com.whatsapp", iconLib: "FontAwesome", icon: "whatsapp", color: "#25D366" },
  { id: "chrome", name: "Chrome", packageName: "com.android.chrome", iconLib: "Feather", icon: "globe", color: "#4285F4" },
  { id: "gmail", name: "Gmail", packageName: "com.google.android.gm", iconLib: "Feather", icon: "mail", color: "#EA4335" },
  { id: "maps", name: "Maps", packageName: "com.google.android.maps", iconLib: "Feather", icon: "map-pin", color: "#34A853" },
  { id: "camera", name: "Camera", packageName: "com.android.camera2", iconLib: "Feather", icon: "camera", color: "#607D8B" },
  { id: "files", name: "Files", packageName: "com.android.documentsui", iconLib: "Feather", icon: "folder", color: "#FF9800" },
  { id: "settings", name: "Settings", packageName: "com.android.settings", iconLib: "Feather", icon: "settings", color: "#78909C" },
];

const DEFAULT_ENABLED = ["youtube", "chrome", "gmail", "camera", "files", "settings"];

interface LauncherContextType {
  pin: string | null;
  isPinSet: boolean;
  isAdminAuthenticated: boolean;
  wallpaperUri: string | null;
  enabledApps: string[];
  isLoading: boolean;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setAdminAuthenticated: (value: boolean) => void;
  setWallpaper: (uri: string | null) => Promise<void>;
  setEnabledApps: (ids: string[]) => Promise<void>;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

export function LauncherProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [enabledApps, setEnabledAppsState] = useState<string[]>(DEFAULT_ENABLED);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PIN_KEY),
      AsyncStorage.getItem(WALLPAPER_KEY),
      AsyncStorage.getItem(APPS_KEY),
    ])
      .then(([storedPin, storedWallpaper, storedApps]) => {
        if (storedPin) setPin(storedPin);
        if (storedWallpaper) setWallpaperUri(storedWallpaper);
        if (storedApps) {
          try { setEnabledAppsState(JSON.parse(storedApps)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setupPin = useCallback(async (newPin: string) => {
    await AsyncStorage.setItem(PIN_KEY, newPin);
    setPin(newPin);
  }, []);

  const verifyPin = useCallback((input: string) => input === pin, [pin]);

  const setAdminAuthenticated = useCallback((value: boolean) => {
    setIsAdminAuthenticated(value);
  }, []);

  const setWallpaper = useCallback(async (uri: string | null) => {
    if (uri) {
      await AsyncStorage.setItem(WALLPAPER_KEY, uri);
    } else {
      await AsyncStorage.removeItem(WALLPAPER_KEY);
    }
    setWallpaperUri(uri);
  }, []);

  const setEnabledApps = useCallback(async (ids: string[]) => {
    await AsyncStorage.setItem(APPS_KEY, JSON.stringify(ids));
    setEnabledAppsState(ids);
  }, []);

  return (
    <LauncherContext.Provider
      value={{
        pin,
        isPinSet: !!pin,
        isAdminAuthenticated,
        wallpaperUri,
        enabledApps,
        isLoading,
        setupPin,
        verifyPin,
        setAdminAuthenticated,
        setWallpaper,
        setEnabledApps,
      }}
    >
      {children}
    </LauncherContext.Provider>
  );
}

export function useLauncher() {
  const ctx = useContext(LauncherContext);
  if (!ctx) throw new Error("useLauncher must be used within LauncherProvider");
  return ctx;
}
