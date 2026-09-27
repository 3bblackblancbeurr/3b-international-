package app.vercel.threebinternational;

import android.animation.ValueAnimator;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.ContentObserver;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;

/** Event-driven policy; owns and releases every observer it registers. */
final class CompanionEnvironment {
    private final Context context;
    private final Runnable onChange;
    private boolean started, batteryLow;
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override public void onReceive(Context ignored, Intent intent) {
            if (Intent.ACTION_BATTERY_CHANGED.equals(intent.getAction())) readBattery(intent);
            onChange.run();
        }
    };
    private final ContentObserver motionObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
        @Override public void onChange(boolean selfChange) { onChange.run(); }
    };
    CompanionEnvironment(Context context, Runnable onChange) {
        this.context = context;
        this.onChange = onChange;
    }
    void start() {
        if (started) return;
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        filter.addAction(Intent.ACTION_BATTERY_CHANGED);
        filter.addAction(Intent.ACTION_TIME_TICK);
        filter.addAction(Intent.ACTION_TIME_CHANGED);
        filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        filter.addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
        Intent battery = ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        if (battery != null) readBattery(battery);
        started = true;
        context.getContentResolver().registerContentObserver(
                Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, motionObserver);
    }
    void stop() {
        if (!started) return;
        started = false;
        context.unregisterReceiver(receiver);
        context.getContentResolver().unregisterContentObserver(motionObserver);
    }
    boolean interactive() {
        PowerManager manager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return manager == null || manager.isInteractive();
    }
    boolean lowPower() {
        PowerManager manager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return batteryLow || (manager != null && manager.isPowerSaveMode());
    }
    boolean motionEnabled() { return animationsEnabled(context); }
    static boolean animationsEnabled(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return ValueAnimator.areAnimatorsEnabled();
        return Settings.Global.getFloat(context.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f;
    }
    private void readBattery(Intent battery) {
        int status = battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
        batteryLow = CompanionPolicy.lowBattery(battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1),
                battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1), charging);
    }
}
