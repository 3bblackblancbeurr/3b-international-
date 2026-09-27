package app.vercel.threebinternational;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ThreeBCompanion")
public class CompanionPlugin extends Plugin {

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("inApp", true);
        result.put("overlay", Settings.canDrawOverlays(getContext()));
        result.put("liveWallpaper", true);
        result.put("liveActivity", false);
        result.put("lockWidget", false);
        call.resolve(result);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        boolean granted = Settings.canDrawOverlays(getContext());
        JSObject result = new JSObject();
        result.put("granted", granted);
        if (!granted) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            result.put("requested", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void startOverlay(PluginCall call) {
        JSObject result = new JSObject();
        if (!Settings.canDrawOverlays(getContext())) {
            result.put("started", false);
            result.put("reason", "overlay_permission_required");
            call.resolve(result);
            return;
        }
        Intent intent = new Intent(getContext(), CompanionOverlayService.class);
        ContextCompat.startForegroundService(getContext(), intent);
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopOverlay(PluginCall call) {
        getContext().stopService(new Intent(getContext(), CompanionOverlayService.class));
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @PluginMethod
    public void setMode(PluginCall call) {
        JSObject result = new JSObject();
        if (!Settings.canDrawOverlays(getContext())) {
            result.put("updated", false);
            result.put("reason", "overlay_permission_required");
            call.resolve(result);
            return;
        }

        String mode = call.getString("mode", "idle");
        Intent intent = new Intent(getContext(), CompanionOverlayService.class);
        intent.setAction(CompanionOverlayService.ACTION_SET_MODE);
        intent.putExtra(CompanionOverlayService.EXTRA_MODE, mode);
        ContextCompat.startForegroundService(getContext(), intent);
        result.put("updated", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openWallpaperPicker(PluginCall call) {
        ComponentName component = new ComponentName(getContext(), CompanionWallpaperService.class);
        Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
        intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, component);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception primary) {
            Intent fallback = new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER);
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
        }
        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }
}
