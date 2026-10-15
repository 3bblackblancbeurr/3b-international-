package app.vercel.threebinternational.health;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class HealthReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        try { HealthReminderStore.deliver(context, intent.getStringExtra("id")); }
        catch (RuntimeException unavailable) { /* No sensitive logs or retry loop. */ }
    }
}
