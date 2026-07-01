---
name: Expo app.json plugin rules
description: Rules for safely editing the plugins array in app.json for Expo projects.
---

## Rule
Only add a package to the `plugins` array in `app.json` if the package's own documentation explicitly states it requires an Expo config plugin (usually evidenced by an `app.plugin.js` file in the package root or an official "Add to plugins" instruction in the README).

After every edit to `app.json`, validate that it is valid JSON (no trailing commas, no syntax errors) before saving.

**Why:** `react-native-keyboard-controller` was incorrectly added to `plugins[]` by a task agent, causing a `PluginError: Unable to resolve a valid config plugin` crash at startup. The package has no `app.plugin.js` and does not require a config plugin entry.

**How to apply:**
- Before adding any entry to `plugins[]`, grep the package's node_modules directory for `app.plugin.js` or check its README for "Add to plugins".
- After any `app.json` edit, parse the JSON mentally (or with a tool) to confirm no trailing commas or malformed arrays remain.
- Packages that commonly DO require plugin entries: `expo-router`, `expo-font`, `expo-camera`, `expo-location`, `expo-media-library`, `expo-image-picker`, `expo-notifications`.
- Packages that do NOT: `react-native-keyboard-controller`, `react-native-reanimated` (handled by babel), most pure-JS libraries.
