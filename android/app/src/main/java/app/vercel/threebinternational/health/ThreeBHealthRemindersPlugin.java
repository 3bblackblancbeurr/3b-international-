package app.vercel.threebinternational.health;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "ThreeBHealthReminders", permissions = {
    @Permission(alias = "healthNotifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public final class ThreeBHealthRemindersPlugin extends Plugin {
    @Override public void load() {
        // Restore existing explicit choices only; never ask permission at startup.
        try { HealthReminderStore.restoreMissing(getContext()); }
        catch (RuntimeException unavailable) { /* Retry when status is requested. */ }
    }

    private JSObject status() {
        String permission;
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("healthNotifications") != PermissionState.GRANTED) {
            PermissionState current = getPermissionState("healthNotifications");
            permission = current == PermissionState.DENIED ? "denied" : "prompt";
        } else permission = HealthReminderStore.notificationsAllowed(getContext()) ? "granted" : "denied";
        JSONArray reminders = HealthReminderStore.read(getContext());
        return new JSObject().put("permission", permission)
            .put("pendingCount", "granted".equals(permission) ? HealthReminderStore.restoreMissing(getContext()) : 0)
            .put("reminders", reminders).put("timing", "approximate");
    }

    @PluginMethod public void getStatus(PluginCall call) { call.resolve(status()); }

    @PluginMethod public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("healthNotifications") == PermissionState.GRANTED) {
            call.resolve(status());
            return;
        }
        getActivity().runOnUiThread(() -> requestPermissionForAlias("healthNotifications", call, "notificationsResult"));
    }

    @PermissionCallback private void notificationsResult(PluginCall call) {
        if (call != null) call.resolve(status());
    }

    @PluginMethod public void schedule(PluginCall call) {
        if (!HealthReminderStore.notificationsAllowed(getContext())) {
            call.reject("Autorisez les notifications pour activer vos rappels.", "NOTIFICATIONS_DENIED");
            return;
        }
        try {
            JSONArray reminders = call.getArray("reminders");
            JSONArray normalized = HealthReminderStore.validate(reminders);
            HealthReminderStore.replace(getContext(), normalized);
            call.resolve(new JSObject().put("scheduled", true).put("count", normalized.length()));
        } catch (JSONException invalid) {
            call.reject("Choisissez au maximum 8 rappels avec un horaire HH:mm et un identifiant unique.", "INVALID_REMINDERS");
        } catch (RuntimeException unavailable) {
            call.reject("Les rappels n’ont pas pu être programmés. Réessayez.", "SCHEDULE_FAILED");
        }
    }

    @PluginMethod public void cancelAll(PluginCall call) {
        try {
            HealthReminderStore.cancelAll(getContext());
            call.resolve(new JSObject().put("cancelled", true));
        } catch (RuntimeException unavailable) {
            call.reject("Les rappels n’ont pas pu être supprimés. Réessayez.", "CANCEL_FAILED");
        }
    }
}
