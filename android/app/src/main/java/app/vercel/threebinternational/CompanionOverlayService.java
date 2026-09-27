package app.vercel.threebinternational;

import android.app.AppOpsManager;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ResultReceiver;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.Calendar;

public class CompanionOverlayService extends Service {
    public static final String ACTION_STOP = "app.vercel.threebinternational.STOP_COMPANION";
    public static final String EXTRA_RESULT = "result";
    private static final String CHANNEL_ID = "threeb_companion";
    private static final int NOTIFICATION_ID = 3303;
    // All access is marshalled to the main thread by the bridge. Updating never starts a service.
    private static CompanionOverlayService activeService;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private CompanionRenderView view;
    private CompanionEnvironment environment;
    private AppOpsManager appOps;
    private boolean foreground, destroyed, batterySaver, reducedPresence, reducedMotion;
    private int direction = -1, walkStartX, walkTargetX;
    private long walkStarted, reactionUntil;
    private String requestedMode = "idle";
    private final AppOpsManager.OnOpChangedListener permissionListener = (op, packageName) ->
            handler.post(() -> { if (!Settings.canDrawOverlays(this)) stopImmediately(); });

    public static boolean isActive() { return activeService != null && !activeService.destroyed; }
    public static void stopActive() { if (activeService != null) activeService.stopImmediately(); }
    public static boolean updateMode(String mode, boolean batterySaver, boolean reducedPresence, boolean reducedMotion) {
        if (!isActive()) return false;
        activeService.applyMode(mode, batterySaver, reducedPresence, reducedMotion);
        return isActive();
    }

    private final Runnable finishReaction = () -> { reactionUntil = 0L; requestedMode = "idle"; refreshPolicy(); };
    private final Runnable wander = () -> {
        if (view == null || !CompanionPolicy.canWander(isVisible(), motionAllowed(), lowPower(),
                reducedPresence, view.isTouching(), view.getMode())) return;
        walkStartX = params.x;
        walkTargetX = direction < 0 ? dp(8) : Math.max(dp(8), screenWidth() - params.width - dp(8));
        direction *= -1;
        walkStarted = SystemClock.uptimeMillis();
        view.setMode("walk");
        handler.post(this.walkFrame);
    };
    private final Runnable walkFrame = new Runnable() {
        @Override public void run() {
            if (view == null || !isVisible() || !motionAllowed() || lowPower() || view.isTouching()) {
                cancelWalk();
                return;
            }
            float t = Math.min(1f, (SystemClock.uptimeMillis() - walkStarted) / 3600f);
            float eased = (float) (0.5 - Math.cos(Math.PI * t) / 2.0);
            params.x = Math.round(walkStartX + (walkTargetX - walkStartX) * eased);
            if (!updatePosition()) return;
            if (t < 1f) handler.postDelayed(this, 34L);
            else { view.setMode("sit"); scheduleWander(); }
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        environment = new CompanionEnvironment(this, this::refreshPolicy);
        createChannel();
        Intent openIntent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, 3303, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 3304,
                new Intent(this, CompanionOverlayService.class).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.star_on).setContentTitle("Compagnon 3B")
                .setContentText("Touchez pour ouvrir 3B · maintenir le compagnon pour arrêter")
                .setContentIntent(open).addAction(android.R.drawable.ic_menu_close_clear_cancel, "Arrêter", stop)
                .setOngoing(true).setSilent(true).setPriority(NotificationCompat.PRIORITY_LOW)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setCategory(NotificationCompat.CATEGORY_SERVICE).build();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(NOTIFICATION_ID, notification);
            foreground = true;
        } catch (SecurityException | IllegalStateException failure) { stopImmediately(); }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) { stopImmediately(); return START_NOT_STICKY; }
        ResultReceiver result = intent.getParcelableExtra(EXTRA_RESULT);
        if (destroyed || !foreground || !Settings.canDrawOverlays(this)) {
            reply(result, false, "overlay_permission_or_service_unavailable");
            stopImmediately();
            return START_NOT_STICKY;
        }
        try {
            if (view == null) createOverlay();
            applyMode(intent.getStringExtra("mode"), intent.getBooleanExtra("batterySaver", true),
                    intent.getBooleanExtra("reducedPresence", false), intent.getBooleanExtra("reducedMotion", false));
            reply(result, true, null);
        } catch (RuntimeException failure) {
            reply(result, false, "overlay_unavailable");
            stopImmediately();
        }
        return START_NOT_STICKY;
    }

    private void createOverlay() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        int width = dp(118), height = dp(142);
        params = new WindowManager.LayoutParams(width, height,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
        // LEFT matches raw touch coordinates even when the device's locale is RTL.
        params.gravity = Gravity.TOP | Gravity.LEFT;
        params.x = Math.max(dp(8), screenWidth() - width - dp(14));
        params.y = Math.round(getResources().getDisplayMetrics().heightPixels * .42f);
        view = new CompanionRenderView(this);
        view.setPolicy(false, false, false, false);
        view.setOnClickListener(ignored -> {
            try { startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)); }
            catch (RuntimeException unavailable) { /* Notification still provides the system-mediated entry point. */ }
        });
        view.setOnLongClickListener(ignored -> { stopImmediately(); return true; });
        view.setMoveListener(new CompanionRenderView.MoveListener() {
            @Override public void onMove(float dx, float dy) {
                if (params == null || destroyed) return;
                params.x += Math.round(dx);
                params.y += Math.round(dy);
                updatePosition();
            }
            @Override public void onTouchChanged(boolean touching) {
                if (touching) cancelWalk();
                else if (!destroyed) scheduleWander();
            }
        });
        windowManager.addView(view, params);
        activeService = this;
        environment.start();
        appOps = (AppOpsManager) getSystemService(APP_OPS_SERVICE);
        if (appOps != null) appOps.startWatchingMode(AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, getPackageName(), permissionListener);
    }

    private void applyMode(String mode, boolean batterySaver, boolean reducedPresence, boolean reducedMotion) {
        cancelWalk();
        handler.removeCallbacks(finishReaction);
        requestedMode = CompanionPolicy.isMode(mode) ? mode : "idle";
        this.batterySaver = batterySaver;
        this.reducedPresence = reducedPresence;
        this.reducedMotion = reducedMotion;
        long duration = CompanionPolicy.reactionDuration(requestedMode);
        reactionUntil = duration > 0 ? SystemClock.uptimeMillis() + duration : 0L;
        refreshPolicy();
    }

    private void refreshPolicy() {
        if (destroyed || view == null) return;
        if (!Settings.canDrawOverlays(this)) { stopImmediately(); return; }
        cancelWalk();
        handler.removeCallbacks(finishReaction);
        if (reactionUntil > 0 && SystemClock.uptimeMillis() >= reactionUntil) { requestedMode = "idle"; reactionUntil = 0; }
        Calendar now = Calendar.getInstance();
        String mode = "idle".equals(requestedMode)
                ? CompanionPolicy.ambientMode(now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE)) : requestedMode;
        boolean visible = isVisible();
        view.setMode(mode);
        view.setVisibility(visible ? View.VISIBLE : View.INVISIBLE);
        view.setPolicy(visible, motionAllowed(), lowPower(), reducedPresence || batterySaver);
        if (visible && reactionUntil > 0) handler.postDelayed(finishReaction, Math.max(1L, reactionUntil - SystemClock.uptimeMillis()));
        scheduleWander();
    }

    private boolean isVisible() {
        KeyguardManager lock = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        return !destroyed && environment != null && environment.interactive() && (lock == null || !lock.isKeyguardLocked());
    }
    private boolean motionAllowed() { return !reducedMotion && environment != null && environment.motionEnabled(); }
    private boolean lowPower() { return environment != null && environment.lowPower(); }
    private void scheduleWander() {
        handler.removeCallbacks(wander);
        if (view != null && CompanionPolicy.canWander(isVisible(), motionAllowed(), lowPower(), reducedPresence, view.isTouching(), view.getMode()))
            handler.postDelayed(wander, batterySaver ? 26000L : 16000L);
    }
    private void cancelWalk() {
        handler.removeCallbacks(wander);
        handler.removeCallbacks(walkFrame);
        if (view != null && "walk".equals(view.getMode())) view.setMode("sit");
    }
    private boolean updatePosition() {
        if (view == null || destroyed) return false;
        if (!Settings.canDrawOverlays(this)) { stopImmediately(); return false; }
        params.x = Math.max(0, Math.min(params.x, Math.max(0, screenWidth() - params.width)));
        params.y = Math.max(0, Math.min(params.y, Math.max(0, getResources().getDisplayMetrics().heightPixels - params.height - dp(28))));
        try { windowManager.updateViewLayout(view, params); return true; }
        catch (RuntimeException unavailable) { stopImmediately(); return false; }
    }
    private int screenWidth() { return getResources().getDisplayMetrics().widthPixels; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private static void reply(ResultReceiver receiver, boolean started, String reason) {
        if (receiver == null) return;
        Bundle result = new Bundle();
        result.putBoolean("started", started);
        if (reason != null) result.putString("reason", reason);
        receiver.send(started ? 1 : 0, result);
    }
    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Compagnon 3B", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Compagnon activé par vous, avec arrêt immédiat.");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }
    @Override public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        cancelWalk();
        updatePosition();
        refreshPolicy();
    }
    private void release() {
        if (destroyed) return;
        destroyed = true;
        if (activeService == this) activeService = null;
        handler.removeCallbacksAndMessages(null);
        if (environment != null) environment.stop();
        if (appOps != null) appOps.stopWatchingMode(permissionListener);
        if (view != null) {
            view.setPolicy(false, false, true, true);
            view.setMoveListener(null);
            if (windowManager != null && view.isAttachedToWindow()) {
                try { windowManager.removeViewImmediate(view); } catch (RuntimeException ignored) { }
            }
        }
        view = null;
        if (foreground) { stopForeground(STOP_FOREGROUND_REMOVE); foreground = false; }
    }
    private void stopImmediately() { release(); stopSelf(); }
    @Override public void onDestroy() { release(); super.onDestroy(); }
    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
