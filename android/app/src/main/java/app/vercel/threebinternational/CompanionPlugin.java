package app.vercel.threebinternational;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.ResultReceiver;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ThreeBCompanion")
public class CompanionPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());

    @PluginMethod public void getCapabilities(PluginCall call) {
        main.post(() -> {
            JSObject result = new JSObject();
            boolean permission = Settings.canDrawOverlays(getContext());
            result.put("platform", "android");
            result.put("inApp", true);
            result.put("overlay", permission);
            result.put("overlayActive", permission && CompanionOverlayService.isActive());
            result.put("liveWallpaper", getContext().getPackageManager().hasSystemFeature("android.software.live_wallpaper"));
            result.put("liveActivity", false);
            result.put("lockWidget", false);
            result.put("reducedMotion", !CompanionEnvironment.animationsEnabled(getContext()));
            PowerManager power = (PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
            Intent battery = getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int status = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
            boolean low = battery != null && CompanionPolicy.lowBattery(battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1),
                    battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1), charging);
            result.put("lowPower", low || (power != null && power.isPowerSaveMode()));
            call.resolve(result);
        });
    }

    @PluginMethod public void requestOverlayPermission(PluginCall call) {
        main.post(() -> {
            boolean granted = Settings.canDrawOverlays(getContext());
            JSObject result = new JSObject();
            result.put("granted", granted);
            if (!granted) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    result.put("requested", true);
                } catch (RuntimeException unavailable) {
                    result.put("requested", false);
                    result.put("reason", "permission_settings_unavailable");
                }
            }
            call.resolve(result);
        });
    }

    @PluginMethod public void startOverlay(PluginCall call) {
        main.post(() -> {
            if (!Settings.canDrawOverlays(getContext())) { resolve(call, "started", false, "overlay_permission_required"); return; }
            // Explicit activation must come from the visible app. Android 15 no longer grants
            // background foreground-service launch rights merely for holding overlay permission.
            if (getActivity() == null || !getActivity().hasWindowFocus()) {
                resolve(call, "started", false, "app_must_be_visible");
                return;
            }
            boolean[] completed = { false };
            Runnable timeout = () -> {
                if (completed[0]) return;
                completed[0] = true;
                getContext().stopService(new Intent(getContext(), CompanionOverlayService.class));
                resolve(call, "started", false, "overlay_start_timeout");
            };
            ResultReceiver response = new ResultReceiver(main) {
                @Override protected void onReceiveResult(int resultCode, Bundle data) {
                    if (completed[0]) return;
                    completed[0] = true;
                    main.removeCallbacks(timeout);
                    resolve(call, "started", resultCode == 1, data == null ? null : data.getString("reason"));
                }
            };
            Intent intent = new Intent(getContext(), CompanionOverlayService.class);
            intent.putExtra(CompanionOverlayService.EXTRA_RESULT, response);
            intent.putExtra("mode", call.getString("mode", "idle"));
            intent.putExtra("batterySaver", call.getBoolean("batterySaver", true));
            intent.putExtra("reducedPresence", call.getBoolean("reducedPresence", false));
            intent.putExtra("reducedMotion", call.getBoolean("reducedMotion", false));
            main.postDelayed(timeout, 5000L);
            try { ContextCompat.startForegroundService(getContext(), intent); }
            catch (RuntimeException unavailable) {
                completed[0] = true;
                main.removeCallbacks(timeout);
                resolve(call, "started", false, "foreground_service_unavailable");
            }
        });
    }

    @PluginMethod public void stopOverlay(PluginCall call) {
        main.post(() -> {
            CompanionOverlayService.stopActive();
            getContext().stopService(new Intent(getContext(), CompanionOverlayService.class));
            resolve(call, "stopped", true, null);
        });
    }

    @PluginMethod public void setMode(PluginCall call) {
        main.post(() -> {
            String mode = call.getString("mode", "idle");
            if (!CompanionPolicy.isMode(mode)) { resolve(call, "updated", false, "invalid_mode"); return; }
            if (!Settings.canDrawOverlays(getContext())) {
                getContext().stopService(new Intent(getContext(), CompanionOverlayService.class));
                resolve(call, "updated", false, "overlay_permission_required");
                return;
            }
            boolean updated = CompanionOverlayService.updateMode(mode, call.getBoolean("batterySaver", true),
                    call.getBoolean("reducedPresence", false), call.getBoolean("reducedMotion", false));
            resolve(call, "updated", updated, updated ? null : "overlay_not_active");
        });
    }

    @PluginMethod public void openWallpaperPicker(PluginCall call) {
        main.post(() -> {
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                    new ComponentName(getContext(), CompanionWallpaperService.class));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { getContext().startActivity(intent); }
            catch (RuntimeException primary) {
                try {
                    Intent fallback = new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                } catch (RuntimeException unavailable) {
                    resolve(call, "opened", false, "live_wallpaper_unavailable");
                    return;
                }
            }
            resolve(call, "opened", true, null);
        });
    }

    private static void resolve(PluginCall call, String key, boolean value, String reason) {
        JSObject result = new JSObject();
        result.put(key, value);
        if (reason != null) result.put("reason", reason);
        call.resolve(result);
    }
}
