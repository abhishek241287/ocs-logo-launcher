/**
 * Expo config plugin: withKiosk
 *
 * Injects the following native Android components at EAS Build / prebuild time:
 *  • KioskAdminReceiver.java  — DeviceAdminReceiver (required for Device Owner)
 *  • KioskModule.java         — ReactNative bridge: startKioskMode / stopKioskMode / etc.
 *  • KioskPackage.java        — registers KioskModule with React Native
 *  • res/xml/device_admin.xml — device-admin policy declarations
 *  • Patches AndroidManifest.xml to declare the receiver
 *  • Patches MainApplication.kt to register KioskPackage
 *
 * DEVICE OWNER PROVISIONING (run once per device via IT admin):
 *   adb shell dpm set-device-owner in.ocs.oorja.launcher/.KioskAdminReceiver
 *
 * Without DO provisioning the app still runs as a restricted kiosk via
 * screen-pinning (user-dismissable). With DO provisioning it is fully locked.
 */

const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PKG = "in.ocs.oorja.launcher";
const PKG_PATH = "in/ocs/oorja/launcher";

// Kotlin hard keywords that cannot be used as plain identifiers in import/package
// statements — each segment that matches must be wrapped in backticks.
// Ref: https://kotlinlang.org/docs/keyword-reference.html#hard-keywords
const KOTLIN_HARD_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for",
  "fun", "if", "in", "interface", "is", "null", "object", "package",
  "return", "super", "this", "throw", "true", "try", "typealias",
  "typeof", "val", "var", "when", "while",
]);

/**
 * Escapes every dot-separated segment of a Kotlin fully-qualified name that
 * is a Kotlin hard keyword, e.g. "in.ocs.oorja.launcher.KioskPackage"
 * becomes "`in`.ocs.oorja.launcher.KioskPackage".
 */
function escapeKotlinFqn(fqn) {
  return fqn
    .split(".")
    .map((seg) => (KOTLIN_HARD_KEYWORDS.has(seg) ? `\`${seg}\`` : seg))
    .join(".");
}

// ---------------------------------------------------------------------------
// Java source templates
// ---------------------------------------------------------------------------

const RECEIVER_JAVA = `package ${PKG};

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

public class KioskAdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
    }

    @Override
    public void onLockTaskModeEntering(Context context, Intent intent, String pkg) {
        super.onLockTaskModeEntering(context, intent, pkg);
    }

    @Override
    public void onLockTaskModeExiting(Context context, Intent intent) {
        super.onLockTaskModeExiting(context, intent);
    }
}
`;

const MODULE_JAVA = `package ${PKG};

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.view.View;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;

import java.util.ArrayList;
import java.util.List;

public class KioskModule extends ReactContextBaseJavaModule {

    // Tracks whether immersive full-screen mode should be enforced. Set true
    // whenever kiosk mode / immersive mode is (re-)applied, false when the
    // admin explicitly exits kiosk mode. MainActivity.onWindowFocusChanged()
    // reads this flag directly (no React bridge round-trip) to reapply the
    // system UI flags after transient focus losses that never reach JS —
    // e.g. pulling down the notification shade, a system permission dialog,
    // or the recents overview — none of which fire React Native's AppState
    // "active" event, since the app never actually leaves the foreground.
    private static volatile boolean immersiveActive = false;

    /**
     * Called from MainActivity.onWindowFocusChanged(true). Best-effort and
     * silent — if it fails, the next focus-regain event (or the next
     * AppState "active" transition from JS) will simply retry.
     */
    public static void reapplyImmersiveIfNeeded(Activity activity) {
        if (immersiveActive && activity != null) {
            try {
                applyImmersiveModeStatic(activity);
            } catch (Exception e) {
                // Ignore — retried on the next focus/foreground event.
            }
        }
    }

    public KioskModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "KioskModule";
    }

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    @ReactMethod
    public void isDeviceOwner(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            DevicePolicyManager dpm =
                (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
            promise.resolve(dpm != null && dpm.isDeviceOwnerApp(ctx.getPackageName()));
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void isInLockTaskMode(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            ActivityManager am =
                (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) { promise.resolve(false); return; }
            promise.resolve(am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    // -----------------------------------------------------------------------
    // Kiosk lifecycle
    // -----------------------------------------------------------------------

    /**
     * Start kiosk mode.
     *
     * Device Owner: whitelists allowed packages via setLockTaskPackages() then
     *               calls startLockTask() for full lock-task enforcement.
     * Non-DO:       applies immersive mode only — startLockTask() is intentionally
     *               skipped because screen-pinning (non-DO lock task) prevents the
     *               launcher from starting activities in other tasks, which breaks
     *               every app tap. Immersive mode alone gives the desired
     *               full-screen appearance without blocking app launches.
     */
    @ReactMethod
    public void startKioskMode(ReadableArray packages, Promise promise) {
        try {
            final Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("E_NO_ACTIVITY", "No current activity");
                return;
            }

            Context ctx = getReactApplicationContext();
            DevicePolicyManager dpm =
                (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);

            final boolean isDeviceOwner = dpm != null && dpm.isDeviceOwnerApp(ctx.getPackageName());

            if (isDeviceOwner) {
                ComponentName admin =
                    new ComponentName(ctx, KioskAdminReceiver.class);

                List<String> pkgList = new ArrayList<>();
                pkgList.add(ctx.getPackageName()); // always include ourselves
                if (packages != null) {
                    for (int i = 0; i < packages.size(); i++) {
                        String p = packages.getString(i);
                        if (p != null && !p.isEmpty()) pkgList.add(p);
                    }
                }
                dpm.setLockTaskPackages(admin, pkgList.toArray(new String[0]));
            }

            activity.runOnUiThread(() -> {
                try {
                    applyImmersiveMode(activity);
                    if (isDeviceOwner) {
                        activity.startLockTask();
                    }
                    promise.resolve(isDeviceOwner);
                } catch (Exception e) {
                    promise.reject("E_LOCK_TASK", e.getMessage());
                }
            });
        } catch (Exception e) {
            promise.reject("E_KIOSK", e.getMessage());
        }
    }

    /**
     * Launch an app by package name.
     *
     * Uses PackageManager.getLaunchIntentForPackage() — the Android-recommended
     * way to start an installed app's main launcher activity. Prefers the current
     * Activity context so the intent resolves correctly without requiring a new
     * task stack entry in restricted modes.
     */
    @ReactMethod
    public void launchApp(String packageName, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            PackageManager pm = ctx.getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(packageName);

            if (intent == null) {
                promise.reject("E_NOT_INSTALLED", "No launch intent for package: " + packageName);
                return;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);

            final Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                ctx.startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("E_LAUNCH", e.getMessage());
        }
    }

    /** Update the lock-task package whitelist without restarting lock task. */
    @ReactMethod
    public void setKioskPackages(ReadableArray packages, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            DevicePolicyManager dpm =
                (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);

            if (dpm == null || !dpm.isDeviceOwnerApp(ctx.getPackageName())) {
                promise.resolve(false);
                return;
            }

            ComponentName admin = new ComponentName(ctx, KioskAdminReceiver.class);
            List<String> pkgList = new ArrayList<>();
            pkgList.add(ctx.getPackageName());
            if (packages != null) {
                for (int i = 0; i < packages.size(); i++) {
                    String p = packages.getString(i);
                    if (p != null && !p.isEmpty()) pkgList.add(p);
                }
            }
            dpm.setLockTaskPackages(admin, pkgList.toArray(new String[0]));
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("E_SET_PKG", e.getMessage());
        }
    }

    @ReactMethod
    public void stopKioskMode(Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No current activity");
            return;
        }
        // Always clear the immersive flag up front — the admin explicitly
        // asked to exit kiosk mode, so window-focus recovery should stop
        // re-enforcing full-screen even if stopLockTask() below throws
        // (expected/harmless on non-Device-Owner installs that were never
        // actually in lock-task mode).
        immersiveActive = false;
        activity.runOnUiThread(() -> {
            try {
                activity.stopLockTask();
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("E_STOP", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void enableImmersiveMode(Promise promise) {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No current activity");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                applyImmersiveMode(activity);
                promise.resolve(true);
            } catch (Exception e) {
                // Never let an exception escape on the UI thread — an uncaught
                // exception here would crash the whole app (e.g. if the window
                // was torn down mid-call due to rotation/backgrounding/lock).
                promise.reject("E_IMMERSIVE", e.getMessage());
            }
        });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private void applyImmersiveMode(Activity activity) {
        applyImmersiveModeStatic(activity);
        immersiveActive = true;
    }

    @SuppressLint("InlinedApi")
    @SuppressWarnings("deprecation")
    private static void applyImmersiveModeStatic(Activity activity) {
        View dv = activity.getWindow().getDecorView();
        dv.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }
}
`;

const PACKAGE_JAVA = `package ${PKG};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class KioskPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new KioskModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

const DEVICE_ADMIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin>
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <encrypted-storage />
        <disable-camera />
        <disable-keyguard-features />
    </uses-policies>
</device-admin>
`;

// ---------------------------------------------------------------------------
// Plugin body
// ---------------------------------------------------------------------------

const withKiosk = (config) => {
  // 1. AndroidManifest — add DeviceAdminReceiver declaration
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app.receiver) app.receiver = [];

    const already = app.receiver.some(
      (r) => r.$["android:name"] === ".KioskAdminReceiver"
    );
    if (!already) {
      app.receiver.push({
        $: {
          "android:name": ".KioskAdminReceiver",
          "android:label": "OCS Kiosk Admin",
          "android:permission": "android.permission.BIND_DEVICE_ADMIN",
          "android:exported": "true",
        },
        "meta-data": [
          {
            $: {
              "android:name": "android.app.device_admin",
              "android:resource": "@xml/device_admin",
            },
          },
        ],
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.app.action.DEVICE_ADMIN_ENABLED" } },
            ],
          },
        ],
      });
    }
    return cfg;
  });

  // 2. Write Java + XML files; patch MainApplication.kt
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const javaDir = path.join(androidRoot, "app/src/main/java", PKG_PATH);
      const xmlDir = path.join(androidRoot, "app/src/main/res/xml");

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, "KioskAdminReceiver.java"), RECEIVER_JAVA);
      fs.writeFileSync(path.join(javaDir, "KioskModule.java"), MODULE_JAVA);
      fs.writeFileSync(path.join(javaDir, "KioskPackage.java"), PACKAGE_JAVA);
      fs.writeFileSync(path.join(xmlDir, "device_admin.xml"), DEVICE_ADMIN_XML);

      // Patch MainApplication.kt — register KioskPackage
      const mainAppPath = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath) && !fs.readFileSync(mainAppPath, "utf8").includes("KioskPackage")) {
        let src = fs.readFileSync(mainAppPath, "utf8");

        // Add import after the first existing import line.
        // escapeKotlinFqn wraps any Kotlin hard keyword segment in backticks
        // (e.g. "in" → "`in`") so the import is valid Kotlin.
        src = src.replace(
          /(^import\s+\S+.*$)/m,
          `$1\nimport ${escapeKotlinFqn(PKG + ".KioskPackage")}`
        );

        // Add package registration inside the apply {} block
        src = src.replace(
          /PackageList\(this\)\.packages\.apply\s*\{/,
          `PackageList(this).packages.apply {\n            add(KioskPackage())`
        );

        fs.writeFileSync(mainAppPath, src);
      }

      // Patch MainActivity.kt — reapply immersive mode on window-focus regain.
      // This covers focus-only interruptions (notification shade, system
      // dialogs, recents overview) that never fire React Native's AppState
      // "active" event because the app never actually leaves the foreground,
      // so the JS-side AppState listener alone can't catch them.
      const mainActivityPath = path.join(javaDir, "MainActivity.kt");
      if (fs.existsSync(mainActivityPath) && !fs.readFileSync(mainActivityPath, "utf8").includes("onWindowFocusChanged")) {
        let src = fs.readFileSync(mainActivityPath, "utf8");

        // KioskModule is in the same package, so no import is needed.
        // Insert the override just before the class's closing brace.
        const lastBraceIndex = src.lastIndexOf("}");
        if (lastBraceIndex !== -1) {
          const override = `
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      KioskModule.reapplyImmersiveIfNeeded(this)
    }
  }
`;
          src = src.slice(0, lastBraceIndex) + override + src.slice(lastBraceIndex);
          fs.writeFileSync(mainActivityPath, src);
        }
      }

      return cfg;
    },
  ]);

  return config;
};

module.exports = withKiosk;
