import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const PIN_KEY = "@ocs:pin";
const WALLPAPER_KEY = "@ocs:wallpaper";
const APPS_KEY = "@ocs:enabled_apps";
const CUSTOM_APPS_KEY = "@ocs:custom_apps";

export interface AppDef {
  id: string;
  name: string;
  packageName: string;
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
    packageName: "android.media.action.IMAGE_CAPTURE",
    intentAction: "android.media.action.IMAGE_CAPTURE",
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
  {
    id: "settings",
    name: "Settings",
    packageName: "android.settings.SETTINGS",
    intentAction: "android.settings.SETTINGS",
    iconLib: "MaterialIcons",
    icon: "settings",
    color: "#78909C",
  },
];

const DEFAULT_ENABLED = ["youtube", "chrome", "gmail", "camera", "files", "settings"];

interface LauncherContextType {
  pin: string | null;
  isPinSet: boolean;
  isAdminAuthenticated: boolean;
  wallpaperUri: string | null;
  enabledApps: string[];
  customApps: AppDef[];
  isLoading: boolean;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setAdminAuthenticated: (value: boolean) => void;
  setWallpaper: (uri: string | null) => Promise<void>;
  setEnabledApps: (ids: string[]) => Promise<void>;
  addCustomApp: (name: string, packageName: string) => Promise<void>;
  removeCustomApp: (id: string) => Promise<void>;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

export function LauncherProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [enabledApps, setEnabledAppsState] = useState<string[]>(DEFAULT_ENABLED);
  const [customApps, setCustomAppsState] = useState<AppDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PIN_KEY),
      AsyncStorage.getItem(WALLPAPER_KEY),
      AsyncStorage.getItem(APPS_KEY),
      AsyncStorage.getItem(CUSTOM_APPS_KEY),
    ])
      .then(([storedPin, storedWallpaper, storedApps, storedCustom]) => {
        if (storedPin) setPin(storedPin);
        if (storedWallpaper) setWallpaperUri(storedWallpaper);
        if (storedApps) {
          try { setEnabledAppsState(JSON.parse(storedApps)); } catch {}
        }
        if (storedCustom) {
          try { setCustomAppsState(JSON.parse(storedCustom)); } catch {}
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

  const addCustomApp = useCallback(
    async (name: string, packageName: string) => {
      const newApp: AppDef = {
        id: `custom_${Date.now()}`,
        name: name.trim(),
        packageName: packageName.trim(),
        iconLib: "MaterialIcons",
        icon: "apps",
        color: "#6B7280",
      };
      const nextCustom = [...customApps, newApp];
      await AsyncStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(nextCustom));
      setCustomAppsState(nextCustom);
      // Auto-enable the new custom app
      const nextEnabled = [...enabledApps, newApp.id];
      await AsyncStorage.setItem(APPS_KEY, JSON.stringify(nextEnabled));
      setEnabledAppsState(nextEnabled);
    },
    [customApps, enabledApps]
  );

  const removeCustomApp = useCallback(
    async (id: string) => {
      const nextCustom = customApps.filter((a) => a.id !== id);
      await AsyncStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(nextCustom));
      setCustomAppsState(nextCustom);
      // Remove from enabled list
      const nextEnabled = enabledApps.filter((a) => a !== id);
      await AsyncStorage.setItem(APPS_KEY, JSON.stringify(nextEnabled));
      setEnabledAppsState(nextEnabled);
    },
    [customApps, enabledApps]
  );

  return (
    <LauncherContext.Provider
      value={{
        pin,
        isPinSet: !!pin,
        isAdminAuthenticated,
        wallpaperUri,
        enabledApps,
        customApps,
        isLoading,
        setupPin,
        verifyPin,
        setAdminAuthenticated,
        setWallpaper,
        setEnabledApps,
        addCustomApp,
        removeCustomApp,
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
