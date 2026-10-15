package app.vercel.threebinternational.health;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import app.vercel.threebinternational.MainActivity;
import app.vercel.threebinternational.R;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;
import java.util.TimeZone;

/** Only opt-in reminder IDs/times persist here. No journal entries or health metrics. */
public final class HealthReminderStore {
    public static final String OPEN_HEALTH = "threeb_open_health";
    static final String CHANNEL = "threeb_health_reminders_v1";
    private static final String PREFS = "threeb_health_reminders_v1";
    private static final String KEY = "daily";
    private static final int NOTIFICATION_BASE = 73100;
    private static final long WINDOW_MS = 10 * 60 * 1000L;
    private HealthReminderStore() {}

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray read(Context context) {
        try { return validate(new JSONArray(preferences(context).getString(KEY, "[]"))); }
        catch (Exception invalid) { return new JSONArray(); }
    }

    static JSONArray validate(JSONArray input) throws JSONException {
        if (input == null || input.length() > 8) throw new JSONException("Maximum 8 rappels");
        JSONArray normalized = new JSONArray();
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < input.length(); i++) {
            JSONObject row = input.getJSONObject(i);
            Object id = row.opt("id"), time = row.opt("time");
            if (!(id instanceof String) || !(time instanceof String)
                || !HealthReminderPolicy.validId((String) id)
                || !HealthReminderPolicy.validTime((String) time) || !ids.add((String) id)) {
                throw new JSONException("Identifiant ou horaire incorrect");
            }
            // Caller titles/bodies are deliberately not persisted or displayed:
            // a lockscreen reminder must never accidentally reveal a health metric.
            normalized.put(new JSONObject().put("id", id).put("time", time));
        }
        return normalized;
    }

    static void channel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Rappels Santé 3B", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Vos routines choisies, sans donnée de santé affichée.");
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    static boolean notificationsAllowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context,
            Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = context.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }

    static synchronized void replace(Context context, JSONArray reminders) throws JSONException {
        JSONArray next = validate(reminders);
        cancelAlarms(context, read(context));
        if (!preferences(context).edit().putString(KEY, next.toString()).commit()) {
            throw new IllegalStateException("Impossible de sauvegarder les rappels");
        }
        channel(context);
        reschedule(context);
    }

    static synchronized void cancelAll(Context context) {
        cancelAlarms(context, read(context));
        if (!preferences(context).edit().remove(KEY).commit()) {
            throw new IllegalStateException("Impossible de supprimer les rappels");
        }
        for (int i = 0; i < 8; i++) NotificationManagerCompat.from(context).cancel(NOTIFICATION_BASE + i);
    }

    private static PendingIntent alarm(Context context, String id, int flags) {
        Intent intent = new Intent(context, HealthReminderReceiver.class)
            .setAction("app.vercel.threebinternational.HEALTH_REMINDER")
            .setData(Uri.parse("threeb-health://reminder/" + id))
            .putExtra("id", id);
        return PendingIntent.getBroadcast(context, 0, intent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelAlarms(Context context, JSONArray reminders) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (int i = 0; i < reminders.length(); i++) {
            String id = reminders.optJSONObject(i).optString("id");
            PendingIntent pending = alarm(context, id, PendingIntent.FLAG_NO_CREATE);
            if (pending != null) { if (manager != null) manager.cancel(pending); pending.cancel(); }
        }
    }

    static synchronized void reschedule(Context context) {
        JSONArray reminders = read(context);
        if (!notificationsAllowed(context)) { cancelAlarms(context, reminders); return; }
        for (int i = 0; i < reminders.length(); i++) scheduleOne(context, reminders.optJSONObject(i));
    }

    static synchronized int restoreMissing(Context context) {
        if (!notificationsAllowed(context)) return 0;
        JSONArray reminders = read(context);
        int pendingCount = 0;
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject row = reminders.optJSONObject(i);
            PendingIntent pending = alarm(context, row.optString("id"), PendingIntent.FLAG_NO_CREATE);
            if (pending == null) {
                try {
                    scheduleOne(context, row);
                    pending = alarm(context, row.optString("id"), PendingIntent.FLAG_NO_CREATE);
                } catch (RuntimeException unavailable) { /* Report only restored schedules. */ }
            }
            if (pending != null) pendingCount++;
        }
        return pendingCount;
    }

    private static void scheduleOne(Context context, JSONObject row) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) throw new IllegalStateException("Alarmes indisponibles");
        long at = HealthReminderPolicy.nextTime(row.optString("time"), System.currentTimeMillis(), TimeZone.getDefault());
        // Inexact by design. No SCHEDULE_EXACT_ALARM, FGS, wake lock or health read.
        PendingIntent pending = alarm(context, row.optString("id"), PendingIntent.FLAG_UPDATE_CURRENT);
        try { manager.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW_MS, pending); }
        catch (RuntimeException unavailable) { pending.cancel(); throw unavailable; }
    }

    static synchronized void deliver(Context context, String id) {
        if (!HealthReminderPolicy.validId(id)) return;
        JSONArray reminders = read(context);
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject row = reminders.optJSONObject(i);
            if (!id.equals(row.optString("id"))) continue;
            if (!notificationsAllowed(context)) return;
            channel(context);
            Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(OPEN_HEALTH, true);
            PendingIntent tap = PendingIntent.getActivity(context, NOTIFICATION_BASE,
                open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_health_notification)
                .setContentTitle("Votre moment 3B")
                .setContentText("Votre routine vous attend. Ouvrez Santé quand vous êtes prêt.")
                .setContentIntent(tap).setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            try { NotificationManagerCompat.from(context).notify(NOTIFICATION_BASE + i, notification.build()); }
            catch (SecurityException revoked) { return; }
            scheduleOne(context, row);
            return;
        }
    }
}
