package app.vercel.threebinternational;

import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;
import java.util.Calendar;

public class CompanionWallpaperService extends WallpaperService {
    @Override public Engine onCreateEngine() { return new CompanionEngine(); }

    private final class CompanionEngine extends Engine {
        private final Handler handler = new Handler(Looper.getMainLooper());
        private final CompanionPainter painter = new CompanionPainter();
        private final CompanionEnvironment environment = new CompanionEnvironment(CompanionWallpaperService.this, this::refresh);
        private boolean visible, surfaceReady, destroyed;
        private final Runnable drawFrame = new Runnable() {
            @Override public void run() {
                if (!canDraw()) return;
                Calendar now = Calendar.getInstance();
                String mode = CompanionPolicy.ambientMode(now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE));
                boolean animated = environment.motionEnabled() && !environment.lowPower();
                if (!draw(mode, animated)) return;
                long delay = CompanionPolicy.frameDelay(true, animated, environment.lowPower(), true, mode);
                if (delay >= 0) handler.postDelayed(this, delay);
            }
        };
        @Override public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            environment.start();
        }
        @Override public void onVisibilityChanged(boolean isVisible) {
            visible = isVisible;
            refresh();
        }
        @Override public void onSurfaceCreated(SurfaceHolder holder) {
            super.onSurfaceCreated(holder);
            surfaceReady = true;
            refresh();
        }
        @Override public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            surfaceReady = true;
            refresh();
        }
        @Override public void onSurfaceDestroyed(SurfaceHolder holder) {
            surfaceReady = false;
            handler.removeCallbacks(drawFrame);
            super.onSurfaceDestroyed(holder);
        }
        @Override public void onDestroy() {
            destroyed = true;
            handler.removeCallbacksAndMessages(null);
            environment.stop();
            super.onDestroy();
        }
        private boolean canDraw() { return !destroyed && visible && surfaceReady && environment.interactive(); }
        private void refresh() {
            handler.removeCallbacks(drawFrame);
            if (canDraw()) handler.post(drawFrame);
        }
        private boolean draw(String mode, boolean animated) {
            SurfaceHolder holder = getSurfaceHolder();
            if (!holder.getSurface().isValid()) return false;
            Canvas canvas = null;
            boolean success = false;
            try {
                canvas = holder.lockCanvas();
                if (canvas == null) return false;
                int w = canvas.getWidth(), h = canvas.getHeight();
                canvas.drawColor(0xFF030509);
                int size = Math.min(w, Math.max(120, Math.min(w / 2, h / 3)));
                canvas.save();
                canvas.translate((w - size) / 2f, Math.max(0, h - size * 1.28f));
                painter.draw(canvas, size, Math.round(size * 1.17f), mode, animated ? SystemClock.uptimeMillis() : 1200L);
                canvas.restore();
                success = true;
            } catch (RuntimeException unavailable) {
                // Surface destruction can race lockCanvas during a launcher transition.
            } finally {
                if (canvas != null) {
                    try { holder.unlockCanvasAndPost(canvas); }
                    catch (RuntimeException unavailable) { success = false; }
                }
            }
            return success;
        }
    }
}
