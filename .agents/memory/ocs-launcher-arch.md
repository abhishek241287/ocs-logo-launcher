---
name: OCS OORJA Launcher architecture
description: Key decisions and structure for the launcher replacing the old Company Logo App, including EAS Build setup.
---

## Context
The Expo mobile artifact (`artifacts/company-logo-app`) was rebuilt into a full Android launcher for OCS OORJA. The old `AppContext` and `(tabs)` layout were replaced entirely.

## Key decisions

- `LauncherContext` (not `AppContext`) is the single context. It holds all launcher config, PIN state, and `isAdminAuthenticated`.
- `setAdminAuthenticated` must be a named `useCallback` in the provider before the value object, or TypeScript will flag it as undeclared.
- All admin screens guard with `useFocusEffect` checking `isAdminAuthenticated` → redirect to `/` if false.
- Home screen calls `setAdminAuthenticated(false)` on every focus — auto-clears session on back navigation.
- Secret admin entry: 5 taps on the logo within 2.5s window (no visible hint).
- PIN flow: first time → `/pin-setup`, subsequent → `/pin-entry`.
- Old files deleted: `app/settings.tsx`, `app/wallpaper.tsx`, `context/AppContext.tsx`, `app/(tabs)/`.

## EAS Build setup

- `eas.json` is in `artifacts/company-logo-app/` (same level as `app.json`).
- User must run `eas build` from `artifacts/company-logo-app/` directory.
- `android.package`: `in.ocs.oorja.launcher`
- `ios.bundleIdentifier`: `in.ocs.oorja.launcher`
- Preview profile builds `.apk` (not `.aab`) — use `--profile preview`.
- App scheme must be alphanumeric: `"ocsoorja"` (not `"company-logo-app"`).

## Critical: package.json for EAS

- **Never use `catalog:` entries** — pnpm workspace catalog is not available outside the monorepo during EAS cloud builds. Always explicit versions.
- **Never use `workspace:*` protocol deps** — same reason. `@workspace/api-client-react` was removed (was unused anyway).
- Native package versions come from `pnpm exec expo install <pkg>` — do NOT guess or set manually; fake versions cause pnpm install failure even if `expo install --check` passes (it validates SDK compat only, not npm existence).
- `expo-battery ^10.0.8`, `expo-network ^8.0.8` — these are the SDK 54-compatible versions from `expo install`.

## Icons

- `icon.png` — 1024×1024 PNG, logo on `#071A0A` background (generated with ImageMagick).
- `adaptive-icon.png` — 1024×1024 PNG, logo centred on transparent background.
- `splash-icon.png` — 512×512 PNG for splash screen.

**Why:** EAS Build requires PNG for all icon assets. JPG icons produce build warnings and potentially malformed icons on Android.

## Build command (for user to run on their machine)

```bash
cd artifacts/company-logo-app
npm install -g eas-cli   # once
eas login                # once — Expo account
eas build --platform android --profile preview
```

The resulting APK download link appears on expo.dev after ~10 min.
