import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const PIN_KEY = "@company_app:pin";

interface AppContextType {
  pin: string | null;
  isPinSet: boolean;
  isLoading: boolean;
  setupPin: (newPin: string) => Promise<void>;
  verifyPin: (inputPin: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PIN_KEY)
      .then((stored) => {
        if (stored) setPin(stored);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setupPin = async (newPin: string) => {
    await AsyncStorage.setItem(PIN_KEY, newPin);
    setPin(newPin);
  };

  const verifyPin = (inputPin: string) => inputPin === pin;

  return (
    <AppContext.Provider
      value={{ pin, isPinSet: !!pin, isLoading, setupPin, verifyPin }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
