package app.vercel.threebinternational;

import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

public class CompanionWallpaperService extends WallpaperService {
    @Override
    public Engine onCreateEngine() {
        return new CompanionEngine();
    }

    private final class CompanionEngine extends Engine {
        private final Handler handler = new Handler(Looper.getMainLooper());
        private final CompanionPainter painter = new CompanionPainter();
        private boolean visible;
        private final Runnable drawFrame = new Runnable() {
            @Override public void run() {
                String mode = currentMode();
                draw(mode);
                if (visible) handler.postDelayed(this, "sleep".equals(mode) ? 900L : 140L);
            }
        };

        @Override
        public void onVisibilityChanged(boolean isVisible) {
            visible = isVisible;
            handler.removeCallbacks(drawFrame);
            if (visible) handler.post(drawFrame);
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            draw(currentMode());
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            visible = false;
            handler.removeCallbacks(drawFrame);
            super.onSurfaceDestroyed(holder);
        }

        private String currentMode() {
            int hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
            return (hour >= 1 && hour < 6) ? "sleep" : "idle";
        }

        private void draw(String mode) {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas == null) return;
                int w = canvas.getWidth();
                int h = canvas.getHeight();
                canvas.drawColor(0xFF030509);
                long now = System.currentTimeMillis();
                int size = Math.max(170, Math.min(w / 2, h / 3));
                canvas.save();
                canvas.translate((w - size) / 2f, h - size * 1.28f);
                painter.draw(canvas, size, Math.round(size * 1.17f), mode, now);
                canvas.restore();
            } finally {
                if (canvas != null) holder.unlockCanvasAndPost(canvas);
            }
        }
    }
}
