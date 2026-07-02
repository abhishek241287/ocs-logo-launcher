import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const PIN_KEY = "@ocs:pin";
const WALLPAPER_KEY = "@ocs:wallpaper";
const APPS_KEY = "@ocs:enabled_apps";
const KIOSK_KEY = "@ocs:kiosk_enabled";

export interface AppDef {
  id: string;
  name: string;
  /**
   * Android package name for package-based launches.
   * Empty string for pure action-based intents (Camera, Settings).
   */
  packageName: string;
  /**
   * When set, this action is fired directly with no package restriction.
   * Used for Camera (STILL_IMAGE_CAMERA) and Settings (android.settings.SETTINGS).
   */
  intentAction?: string;
  iconLib: "MaterialIcons" | "MaterialCommunityIcons";
  icon: string;
  color: string;
}

export const CURATED_APPS: AppDef[] = [
  {
    id: "youtube",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    iconLib: "MaterialIcons",
    icon: "play-circle",
    color: "#FF0000",
  },
  {
    id: "instagram",
    name: "Instagram",
    packageName: "com.instagram.android",
    iconLib: "MaterialIcons",
    icon: "camera",
    color: "#C13584",
  },
  {
    id: "facebook",
    name: "Facebook",
    packageName: "com.facebook.katana",
    iconLib: "MaterialCommunityIcons",
    icon: "facebook",
    color: "#1877F2",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    packageName: "com.whatsapp",
    iconLib: "MaterialCommunityIcons",
    icon: "whatsapp",
    color: "#25D366",
  },
  {
    id: "chrome",
    name: "Chrome",
    packageName: "com.android.chrome",
    iconLib: "MaterialIcons",
    icon: "language",
    color: "#4285F4",
  },
  {
    id: "gmail",
    name: "Gmail",
    packageName: "com.google.android.gm",
    iconLib: "MaterialIcons",
    icon: "email",
    color: "#EA4335",
  },
  {
    id: "maps",
    name: "Maps",
    packageName: "com.google.android.apps.maps",
    iconLib: "MaterialIcons",
    icon: "map",
    color: "#34A853",
  },
  {
    id: "camera",
    name: "Camera",
    packageName: "",
    intentAction: "android.media.action.STILL_IMAGE_CAMERA",
    iconLib: "MaterialIcons",
    icon: "photo-camera",
    color: "#607D8B",
  },
  {
    id: "files",
    name: "Files",
    packageName: "com.android.documentsui",
    iconLib: "MaterialIcons",
    icon: "folder",
    color: "#FF9800",
  },
];

// Default allowed apps — Settings excluded in kiosk mode per requirements.
// Admin can re-enable any app via the Allowed Apps panel.
const DEFAULT_ENABLED = ["youtube", "chrome", "gmail", "camera", "files"];

interface LauncherContextType {
  pin: string | null;
  isPinSet: boolean;
  isAdminAuthenticated: boolean;
  wallpaperUri: string | null;
  enabledApps: string[];
  /** Whether kiosk mode should be active (persisted; toggled by admin). */
  isKioskEnabled: boolean;
  isLoading: boolean;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setAdminAuthenticated: (value: boolean) => void;
  setWallpaper: (uri: string | null) => Promise<void>;
  setEnabledApps: (ids: string[]) => Promise<void>;
  setKioskEnabled: (val: boolean) => Promise<void>;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

export function LauncherProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [enabledApps, setEnabledAppsState] = useState<string[]>(DEFAULT_ENABLED);
  const [isKioskEnabled, setIsKioskEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PIN_KEY),
      AsyncStorage.getItem(WALLPAPER_KEY),
      AsyncStorage.getItem(APPS_KEY),
      AsyncStorage.getItem(KIOSK_KEY),
    ])
      .then(([storedPin, storedWallpaper, storedApps, storedKiosk]) => {
        if (storedPin) setPin(storedPin);
        if (storedWallpaper) setWallpaperUri(storedWallpaper);
        if (storedApps) {
          try { setEnabledAppsState(JSON.parse(storedApps)); } catch {}
        }
        // Default kiosk to ON; only false if admin explicitly disabled it.
        if (storedKiosk !== null) {
          setIsKioskEnabledState(storedKiosk === "true");
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

  const setKioskEnabled = useCallback(async (val: boolean) => {
    await AsyncStorage.setItem(KIOSK_KEY, String(val));
    setIsKioskEnabledState(val);
  }, []);

  return (
    <LauncherContext.Provider
      value={{
        pin,
        isPinSet: !!pin,
        isAdminAuthenticated,
        wallpaperUri,
        enabledApps,
        isKioskEnabled,
        isLoading,
        setupPin,
        verifyPin,
        setAdminAuthenticated,
        setWallpaper,
        setEnabledApps,
        setKioskEnabled,
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
