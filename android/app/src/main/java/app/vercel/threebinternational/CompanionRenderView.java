package app.vercel.threebinternational;

import android.content.Context;
import android.graphics.Canvas;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;

public class CompanionRenderView extends View {
    public interface MoveListener {
        void onMove(float dx, float dy);
        void onTouchChanged(boolean touching);
    }
    private final CompanionPainter painter = new CompanionPainter();
    private final Runnable frame = this::invalidate;
    private final int touchSlop;
    private String mode = "idle";
    private float lastX, lastY, downX, downY;
    private boolean dragging, touching, active = true, motion = true, lowPower, reducedPresence;
    private MoveListener moveListener;

    public CompanionRenderView(Context context) {
        super(context);
        touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        setContentDescription("Compagnon 3B · toucher pour ouvrir 3B, maintenir pour arrêter");
        setClickable(true);
        setLongClickable(true);
    }
    public void setMode(String nextMode) {
        mode = CompanionPolicy.isMode(nextMode) ? nextMode : "idle";
        removeCallbacks(frame);
        invalidate();
    }
    public String getMode() { return mode; }
    public boolean isTouching() { return touching; }
    public void setMoveListener(MoveListener listener) { moveListener = listener; }
    public void setPolicy(boolean active, boolean motion, boolean lowPower, boolean reducedPresence) {
        this.active = active;
        this.motion = motion;
        this.lowPower = lowPower;
        this.reducedPresence = reducedPresence;
        removeCallbacks(frame);
        if (active) invalidate();
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        // Stable open-eyed pose without halo rotation or particles in reduced motion.
        painter.draw(canvas, getWidth(), getHeight(), mode, motion && !lowPower ? SystemClock.uptimeMillis() : 1200L);
        removeCallbacks(frame);
        long delay = CompanionPolicy.frameDelay(active && isShown() && isAttachedToWindow(),
                motion, lowPower, reducedPresence, mode);
        if (delay >= 0) postDelayed(frame, delay);
    }
    @Override protected void onDetachedFromWindow() {
        removeCallbacks(frame);
        endTouch();
        super.onDetachedFromWindow();
    }
    @Override protected void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        removeCallbacks(frame);
        if (visibility == VISIBLE && active) invalidate();
    }
    @Override public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = lastX = event.getRawX();
                downY = lastY = event.getRawY();
                dragging = false;
                touching = true;
                if (moveListener != null) moveListener.onTouchChanged(true);
                return super.onTouchEvent(event);
            case MotionEvent.ACTION_MOVE:
                float x = event.getRawX(), y = event.getRawY();
                if (!dragging && Math.hypot(x - downX, y - downY) > touchSlop) {
                    dragging = true;
                    cancelLongPress();
                    setPressed(false);
                }
                if (dragging && moveListener != null) moveListener.onMove(x - lastX, y - lastY);
                lastX = x;
                lastY = y;
                return true;
            case MotionEvent.ACTION_UP:
                if (dragging) {
                    MotionEvent cancel = MotionEvent.obtain(event);
                    cancel.setAction(MotionEvent.ACTION_CANCEL);
                    super.onTouchEvent(cancel);
                    cancel.recycle();
                } else super.onTouchEvent(event);
                endTouch();
                return true;
            case MotionEvent.ACTION_CANCEL:
                endTouch();
                return super.onTouchEvent(event);
            default:
                return super.onTouchEvent(event);
        }
    }
    private void endTouch() {
        if (!touching) return;
        touching = false;
        dragging = false;
        if (moveListener != null) moveListener.onTouchChanged(false);
    }
    @Override public boolean performClick() { return super.performClick(); }
}
