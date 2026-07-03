/**
 * kiosk.ts — JS interface to the native KioskModule
 *
 * All functions degrade gracefully when the native module is unavailable
 * (Expo Go, non-Android, pre-build). In those contexts every call is a no-op
 * that resolves false/null — the UI should reflect the degraded state.
 *
 * Every native call is wrapped in a timeout so a hung native promise (e.g.
 * an Activity that never runs a queued `runOnUiThread` block) can never
 * freeze the launcher UI — it always resolves within NATIVE_CALL_TIMEOUT_MS.
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

const NATIVE_CALL_TIMEOUT_MS = 4000;

/**
 * Races a native promise against a timeout so a stuck native call (never
 * resolves or rejects) can never hang the calling JS code forever.
 * On timeout, rejects with an Error whose message includes "E_TIMEOUT" so
 * callers can distinguish it from a genuine native rejection if needed.
 */
function withTimeout<T>(promise: Promise<T>, ms: number = NATIVE_CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("E_TIMEOUT: native call did not respond in time"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const isKioskNativeAvailable = native !== null;

/** True if the app is set as Android Device Owner (fully locked kiosk). */
export async function isDeviceOwner(): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.isDeviceOwner()); } catch { return false; }
}

/** True if the device is currently in lock-task / kiosk mode. */
export async function isInLockTaskMode(): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.isInLockTaskMode()); } catch { return false; }
}

/**
 * Start kiosk mode.
 * - If Device Owner: sets lock-task package whitelist then starts lock task.
 * - If not Device Owner: applies immersive full-screen mode only (no
 *   screen-pinning), so app launches from the launcher keep working.
 * Never throws and never hangs — always resolves within NATIVE_CALL_TIMEOUT_MS,
 * falling back to `false` on any failure or timeout.
 * @param allowedPackages — package names of apps that may be launched while locked.
 */
export async function startKioskMode(allowedPackages: string[]): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.startKioskMode(allowedPackages)); } catch { return false; }
}

/**
 * Exit kiosk / lock-task mode. Only admin should call this.
 * Never throws and never hangs — resolves false on failure/timeout (e.g. if
 * the device was never actually in lock-task mode, which is expected for
 * non-Device-Owner installs and is not treated as an error).
 */
export async function stopKioskMode(): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.stopKioskMode()); } catch { return false; }
}

/**
 * Update the lock-task package whitelist live (Device Owner only).
 * Called when admin changes allowed apps without restarting kiosk.
 */
export async function setKioskPackages(allowedPackages: string[]): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.setKioskPackages(allowedPackages)); } catch { return false; }
}

/**
 * Re-apply immersive (full-screen, hide navigation) system UI flags.
 * Call on AppState 'active' and on screen focus to keep bars hidden after
 * returning from an allowed app.
 */
export async function enableImmersiveMode(): Promise<boolean> {
  if (!native) return false;
  try { return await withTimeout(native.enableImmersiveMode()); } catch { return false; }
}

/** Structured result of a launch attempt — lets callers show the right UI. */
export type LaunchResult =
  | { ok: true }
  | { ok: false; reason: "not_installed" | "timeout" | "unavailable" | "error"; message?: string };

/**
 * Launch an installed app by package name.
 *
 * Uses PackageManager.getLaunchIntentForPackage() natively — the
 * Android-recommended approach, with a null check on the native side.
 * Never throws — always resolves to a LaunchResult, even on timeout, so the
 * launcher UI can never freeze on a tap.
 */
export async function launchApp(packageName: string): Promise<LaunchResult> {
  if (!native) return { ok: false, reason: "unavailable" };

  try {
    await withTimeout(native.launchApp(packageName));
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("E_TIMEOUT")) {
      return { ok: false, reason: "timeout", message };
    }

    const isNotInstalled =
      message.includes("E_NOT_INSTALLED") ||
      message.includes("ActivityNotFoundException") ||
      message.includes("No Activity found") ||
      message.includes("No activity found");

    return {
      ok: false,
      reason: isNotInstalled ? "not_installed" : "error",
      message,
    };
  }
}
