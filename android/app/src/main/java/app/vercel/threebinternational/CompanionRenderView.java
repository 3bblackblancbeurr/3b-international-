package app.vercel.threebinternational;

import android.content.Context;
import android.graphics.Canvas;
import android.os.PowerManager;
import android.view.MotionEvent;
import android.view.View;

public class CompanionRenderView extends View {
    public interface MoveListener {
        void onMove(float dx, float dy);
    }

    private final CompanionPainter painter = new CompanionPainter();
    private String mode = "idle";
    private float lastX;
    private float lastY;
    private MoveListener moveListener;
    private final PowerManager powerManager;

    public CompanionRenderView(Context context) {
        super(context);
        powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        setContentDescription("Compagnon 3B");
    }

    public void setMode(String nextMode) {
        if (nextMode == null || nextMode.isEmpty()) nextMode = "idle";
        mode = nextMode;
        invalidate();
    }

    public String getMode() {
        return mode;
    }

    public void setMoveListener(MoveListener listener) {
        moveListener = listener;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        painter.draw(canvas, getWidth(), getHeight(), mode, android.os.SystemClock.uptimeMillis());
        if (isShown()) {
            long delay;
            if (powerManager != null && !powerManager.isInteractive()) delay = 1500L;
            else if ("sleep".equals(mode)) delay = 800L;
            else if (powerManager != null && powerManager.isPowerSaveMode()) delay = 280L;
            else if ("walk".equals(mode) || "celebrate".equals(mode) || "notification".equals(mode)) delay = 34L;
            else delay = 110L;
            postInvalidateDelayed(delay);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lastX = event.getRawX();
                lastY = event.getRawY();
                return true;
            case MotionEvent.ACTION_MOVE:
                float x = event.getRawX();
                float y = event.getRawY();
                if (moveListener != null) moveListener.onMove(x - lastX, y - lastY);
                lastX = x;
                lastY = y;
                return true;
            case MotionEvent.ACTION_UP:
                performClick();
                return true;
            default:
                return super.onTouchEvent(event);
        }
    }

    @Override
    public boolean performClick() {
        super.performClick();
        return true;
    }
}
