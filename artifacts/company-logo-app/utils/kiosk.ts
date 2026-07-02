/**
 * kiosk.ts — JS interface to the native KioskModule
 *
 * All functions degrade gracefully when the native module is unavailable
 * (Expo Go, non-Android, pre-build). In those contexts every call is a no-op
 * that resolves false/null — the UI should reflect the degraded state.
 */

import { NativeModules, Platform } from "react-native";

// Typed shape of the native module
interface KioskNative {
  isDeviceOwner(): Promise<boolean>;
  isInLockTaskMode(): Promise<boolean>;
  startKioskMode(packages: string[]): Promise<boolean>;
  stopKioskMode(): Promise<boolean>;
  setKioskPackages(packages: string[]): Promise<boolean>;
  enableImmersiveMode(): Promise<boolean>;
  launchApp(packageName: string): Promise<boolean>;
}

const native: KioskNative | null =
  Platform.OS === "android" ? (NativeModules.KioskModule ?? null) : null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const isKioskNativeAvailable = native !== null;

/** True if the app is set as Android Device Owner (fully locked kiosk). */
export async function isDeviceOwner(): Promise<boolean> {
  if (!native) return false;
  try { return await native.isDeviceOwner(); } catch { return false; }
}

/** True if the device is currently in lock-task / kiosk mode. */
export async function isInLockTaskMode(): Promise<boolean> {
  if (!native) return false;
  try { return await native.isInLockTaskMode(); } catch { return false; }
}

/**
 * Start kiosk mode.
 * - If Device Owner: sets lock-task package whitelist then starts lock task.
 * - If not Device Owner: starts lock task (Android screen-pinning dialog shown once).
 * @param allowedPackages — package names of apps that may be launched while locked.
 */
export async function startKioskMode(allowedPackages: string[]): Promise<boolean> {
  if (!native) return false;
  try { return await native.startKioskMode(allowedPackages); } catch { return false; }
}

/** Exit kiosk / lock-task mode. Only admin should call this. */
export async function stopKioskMode(): Promise<boolean> {
  if (!native) return false;
  try { return await native.stopKioskMode(); } catch { return false; }
}

/**
 * Update the lock-task package whitelist live (Device Owner only).
 * Called when admin changes allowed apps without restarting kiosk.
 */
export async function setKioskPackages(allowedPackages: string[]): Promise<boolean> {
  if (!native) return false;
  try { return await native.setKioskPackages(allowedPackages); } catch { return false; }
}

/**
 * Re-apply immersive (full-screen, hide navigation) system UI flags.
 * Call on AppState 'active' and on screen focus to keep bars hidden after
 * returning from an allowed app.
 */
export async function enableImmersiveMode(): Promise<boolean> {
  if (!native) return false;
  try { return await native.enableImmersiveMode(); } catch { return false; }
}

/**
 * Launch an installed app by package name.
 *
 * Uses PackageManager.getLaunchIntentForPackage() natively — the
 * Android-recommended approach. Rejects with E_NOT_INSTALLED if the app
 * is not installed. Resolves true on success.
 */
export async function launchApp(packageName: string): Promise<boolean> {
  if (!native) return false;
  try { return await native.launchApp(packageName); } catch { return false; }
}
