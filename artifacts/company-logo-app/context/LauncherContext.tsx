import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@ocs_launcher:config";
const PIN_KEY = "@ocs_launcher:pin";

export const APP_VERSION = "1.0.0";

export interface AppItem {
  id: string;
  name: string;
  packageName: string;
  icon: string;
  enabled: boolean;
  isSystem?: boolean;
}

export interface LauncherConfig {
  companyName: string;
  customerName: string;
  supportNumber: string;
  deviceName: string;
  backgroundColor: string;
  accentColor: string;
  kioskMode: boolean;
  visibleApps: AppItem[];
  logoSource: "default" | "custom";
  customLogoUri?: string;
  otaUpdateUrl: string;
  lastUpdated: number;
}

const DEFAULT_APPS: AppItem[] = [
  { id: "1", name: "OCS One ERP", packageName: "com.ocs.erp", icon: "briefcase", enabled: true },
  { id: "2", name: "Camera", packageName: "com.android.camera2", icon: "camera", enabled: true },
  { id: "3", name: "Files", packageName: "com.android.documentsui", icon: "folder", enabled: true },
  { id: "4", name: "Calculator", packageName: "com.android.calculator2", icon: "calculator", enabled: true },
  { id: "5", name: "Maps", packageName: "com.google.android.maps", icon: "map-pin", enabled: true },
  { id: "6", name: "Settings", packageName: "com.android.settings", icon: "settings", enabled: false, isSystem: true },
  { id: "7", name: "Chrome", packageName: "com.android.chrome", icon: "globe", enabled: false, isSystem: true },
  { id: "8", name: "Gmail", packageName: "com.google.android.gm", icon: "mail", enabled: false, isSystem: true },
  { id: "9", name: "Play Store", packageName: "com.android.vending", icon: "shopping-bag", enabled: false, isSystem: true },
  { id: "10", name: "YouTube", packageName: "com.google.android.youtube", icon: "youtube", enabled: false, isSystem: true },
  { id: "11", name: "Photos", packageName: "com.google.android.apps.photos", icon: "image", enabled: false, isSystem: true },
  { id: "12", name: "Contacts", packageName: "com.android.contacts", icon: "users", enabled: false, isSystem: true },
  { id: "13", name: "Phone", packageName: "com.android.phone", icon: "phone", enabled: false, isSystem: true },
  { id: "14", name: "Messages", packageName: "com.android.mms", icon: "message-square", enabled: false, isSystem: true },
  { id: "15", name: "Clock", packageName: "com.android.deskclock", icon: "clock", enabled: false, isSystem: true },
  { id: "16", name: "Drive", packageName: "com.google.android.apps.docs", icon: "hard-drive", enabled: false, isSystem: true },
];

const DEFAULT_CONFIG: LauncherConfig = {
  companyName: "OCS OORJA",
  customerName: "",
  supportNumber: "",
  deviceName: "OCS Tablet",
  backgroundColor: "#0A1A0F",
  accentColor: "#3A8B3F",
  kioskMode: false,
  visibleApps: DEFAULT_APPS,
  logoSource: "default",
  otaUpdateUrl: "",
  lastUpdated: Date.now(),
};

interface LauncherContextType {
  config: LauncherConfig;
  isAdminAuthenticated: boolean;
  isPinSet: boolean;
  isLoading: boolean;
  updateConfig: (updates: Partial<LauncherConfig>) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setAdminAuthenticated: (value: boolean) => void;
  resetConfig: () => Promise<void>;
  exportConfig: () => string;
  importConfig: (json: string) => Promise<boolean>;
}

const LauncherContext = createContext<LauncherContextType | null>(null);

export function LauncherProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LauncherConfig>(DEFAULT_CONFIG);
  const [pin, setPin] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(PIN_KEY),
    ])
      .then(([storedConfig, storedPin]) => {
        if (storedConfig) {
          try {
            const parsed = JSON.parse(storedConfig) as LauncherConfig;
            setConfig({ ...DEFAULT_CONFIG, ...parsed });
          } catch {}
        }
        if (storedPin) setPin(storedPin);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const updateConfig = useCallback(async (updates: Partial<LauncherConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates, lastUpdated: Date.now() };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setupPin = useCallback(async (newPin: string) => {
    await AsyncStorage.setItem(PIN_KEY, newPin);
    setPin(newPin);
  }, []);

  const verifyPin = useCallback((input: string) => input === pin, [pin]);

  const resetConfig = useCallback(async () => {
    const fresh = { ...DEFAULT_CONFIG, lastUpdated: Date.now() };
    setConfig(fresh);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const exportConfig = useCallback(() => {
    return JSON.stringify({ config, version: "1.0", appVersion: APP_VERSION }, null, 2);
  }, [config]);

  const setAdminAuthenticated = useCallback((value: boolean) => setIsAdminAuthenticated(value), []);

  const importConfig = useCallback(async (json: string) => {
    try {
      const parsed = JSON.parse(json);
      const imported = parsed.config as LauncherConfig;
      if (!imported || !imported.companyName) return false;
      const next = { ...DEFAULT_CONFIG, ...imported, lastUpdated: Date.now() };
      setConfig(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <LauncherContext.Provider
      value={{
        config,
        isAdminAuthenticated,
        isPinSet: !!pin,
        isLoading,
        updateConfig,
        setupPin,
        verifyPin,
        setAdminAuthenticated,
        resetConfig,
        exportConfig,
        importConfig,
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
