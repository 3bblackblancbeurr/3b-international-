package app.vercel.threebinternational;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.view.Gravity;
import android.view.WindowManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class CompanionOverlayService extends Service {
    public static final String ACTION_SET_MODE = "app.vercel.threebinternational.SET_COMPANION_MODE";
    public static final String EXTRA_MODE = "mode";
    private static final String CHANNEL_ID = "threeb_companion";
    private static final int NOTIFICATION_ID = 3303;

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private CompanionRenderView view;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int direction = -1;

    private final Runnable wander = new Runnable() {
        @Override public void run() {
            if (view == null || params == null || windowManager == null) return;
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && pm.isInteractive()) animateWalk();
            handler.postDelayed(this, 26000);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.star_on)
                .setContentTitle("Compagnon 3B")
                .setContentText("Toujours avec vous · toucher 3B pour régler")
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        int width = dp(118);
        int height = dp(142);
        params = new WindowManager.LayoutParams(
                width,
                height,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = Math.max(dp(8), getResources().getDisplayMetrics().widthPixels - width - dp(14));
        params.y = Math.max(dp(90), (int) (getResources().getDisplayMetrics().heightPixels * .42f));

        view = new CompanionRenderView(this);
        view.setMode("idle");
        view.setMoveListener((dx, dy) -> {
            if (params == null || windowManager == null || view == null) return;
            params.x += Math.round(dx);
            params.y += Math.round(dy);
            clampPosition();
            try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) {}
        });
        windowManager.addView(view, params);
        handler.postDelayed(wander, 12000);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_SET_MODE.equals(intent.getAction()) && view != null) {
            String mode = intent.getStringExtra(EXTRA_MODE);
            view.setMode(mode == null ? "idle" : mode);
        }
        return START_STICKY;
    }

    private void animateWalk() {
        if (view == null || params == null || windowManager == null) return;
        final int startX = params.x;
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        final int targetX = direction < 0 ? dp(8) : Math.max(dp(8), screenWidth - params.width - dp(8));
        direction *= -1;
        view.setMode("walk");
        final int frames = 48;
        for (int i = 1; i <= frames; i++) {
            final int frame = i;
            handler.postDelayed(() -> {
                if (view == null || params == null || windowManager == null) return;
                float t = frame / (float) frames;
                float eased = (float) (0.5 - Math.cos(Math.PI * t) / 2.0);
                params.x = Math.round(startX + (targetX - startX) * eased);
                clampPosition();
                try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) {}
                if (frame == frames) view.setMode("sit");
            }, i * 65L);
        }
    }

    private void clampPosition() {
        int sw = getResources().getDisplayMetrics().widthPixels;
        int sh = getResources().getDisplayMetrics().heightPixels;
        params.x = Math.max(0, Math.min(params.x, Math.max(0, sw - params.width)));
        params.y = Math.max(0, Math.min(params.y, Math.max(0, sh - params.height)));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Compagnon 3B",
                NotificationManager.IMPORTANCE_MIN
        );
        channel.setDescription("Maintient le Compagnon 3B visible quand vous quittez l’application.");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (view != null && windowManager != null) {
            try { windowManager.removeView(view); } catch (Exception ignored) {}
        }
        view = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
