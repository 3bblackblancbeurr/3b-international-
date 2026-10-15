package app.vercel.threebinternational.health;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class HealthReminderRestoreReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            && !Intent.ACTION_TIME_CHANGED.equals(action) && !Intent.ACTION_TIMEZONE_CHANGED.equals(action)) return;
        try { HealthReminderStore.reschedule(context); }
        catch (RuntimeException unavailable) { /* Retry when the app next opens. */ }
    }
}
