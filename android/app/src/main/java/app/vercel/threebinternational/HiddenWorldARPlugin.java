package app.vercel.threebinternational;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ar.core.ArCoreApk;
import app.vercel.threebinternational.ar.HiddenARActivity;

/** Only a local rendering lab can launch; no mission, location or reward API. */
@CapacitorPlugin(name = "HiddenWorldAR")
public class HiddenWorldARPlugin extends Plugin {
    private boolean launching;

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        getActivity().runOnUiThread(() -> ArCoreApk.getInstance().checkAvailabilityAsync(getContext(), availability -> {
            JSObject result = new JSObject();
            result.put("available", availability.isSupported());
            result.put("checking", availability.isTransient());
            result.put("reason", availability.isSupported() ? "ready" : availability.isTransient() ? "checking" : "unsupported");
            result.put("engine", "arcore");
            // Depth availability is queried on the actual session, never guessed from a brand.
            result.put("depth", "session-check");
            call.resolve(result);
        }));
    }

    @PluginMethod
    public void openPortal(PluginCall call) {
        if (!"portal-lab".equals(call.getString("sceneId"))) {
            call.reject("Cette scène n’est pas ouverte.", "SCENE_NOT_AVAILABLE"); return;
        }
        getActivity().runOnUiThread(() -> {
            if (launching) { call.reject("Une session est déjà ouverte.", "SESSION_ACTIVE"); return; }
            launching = true;
            try { startActivityForResult(call, new Intent(getActivity(), HiddenARActivity.class), "portalClosed"); }
            catch (RuntimeException error) { launching = false; call.reject("Le module spatial ne peut pas démarrer.", "START_FAILED", error); }
        });
    }

    @ActivityCallback
    private void portalClosed(PluginCall call, ActivityResult result) {
        launching = false;
        if (call == null) return;
        JSObject data = new JSObject(); data.put("closed", true);
        if (result.getData() != null) data.put("message", result.getData().getStringExtra("message"));
        call.resolve(data);
    }
}
