package app.vercel.threebinternational;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;

final class CompanionPainter {
    private static final int GOLD = Color.rgb(232, 189, 100);
    private static final int GOLD_LIGHT = Color.rgb(255, 232, 169);
    private static final int BLUE = Color.rgb(42, 168, 255);
    private static final int BLUE_LIGHT = Color.rgb(133, 232, 255);
    private static final int BLACK = Color.rgb(5, 7, 11);

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path = new Path();

    void draw(Canvas canvas, int width, int height, String mode, long nowMs) {
        if (width <= 0 || height <= 0) return;
        float scale = Math.min(width / 256f, height / 300f);
        float ox = (width - 256f * scale) / 2f;
        float oy = (height - 300f * scale) / 2f;
        canvas.save();
        canvas.translate(ox, oy);
        canvas.scale(scale, scale);

        float bob = 0f;
        if (!"sleep".equals(mode)) bob = (float) Math.sin(nowMs / 620.0) * 2.4f;
        if ("walk".equals(mode)) bob += (float) Math.abs(Math.sin(nowMs / 145.0)) * -6f;
        if ("celebrate".equals(mode)) bob -= (float) Math.abs(Math.sin(nowMs / 180.0)) * 13f;
        canvas.translate(0f, bob);

        drawShadow(canvas);
        drawHalo(canvas, nowMs);
        drawCape(canvas);
        drawBody(canvas);
        drawHead(canvas, mode, nowMs);
        drawLegs(canvas);
        drawFx(canvas, mode, nowMs);
        canvas.restore();
    }

    private void drawShadow(Canvas c) {
        paint.setShader(new RadialGradient(128, 283, 70, new int[]{0x65000000, 0x00000000}, null, Shader.TileMode.CLAMP));
        c.drawOval(new RectF(62, 273, 194, 292), paint);
        paint.setShader(null);
    }

    private void drawHalo(Canvas c, long now) {
        c.save();
        c.rotate((now / 18f) % 360f, 160, 28);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(5);
        paint.setShader(goldGradient());
        c.drawOval(new RectF(124, 16, 196, 40), paint);
        paint.setShader(null);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(GOLD_LIGHT);
        c.drawCircle(165, 18, 4, paint);
        c.restore();
    }

    private void drawCape(Canvas c) {
        path.reset();
        path.moveTo(172, 151);
        path.cubicTo(205, 162, 228, 190, 239, 220);
        path.cubicTo(219, 210, 203, 208, 188, 211);
        path.cubicTo(185, 187, 179, 169, 164, 158);
        path.close();
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF070A0F);
        c.drawPath(path, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawPath(path, paint);
    }

    private void drawBody(Canvas c) {
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new LinearGradient(70, 120, 199, 245,
                new int[]{0xFF141821, BLACK, 0xFF0A0D12}, null, Shader.TileMode.CLAMP));
        RectF torso = new RectF(67, 112, 201, 250);
        c.drawRoundRect(torso, 56, 56, paint);
        paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawRoundRect(torso, 56, 56, paint);

        paint.setStyle(Paint.Style.FILL);
        paint.setShader(whiteGradient());
        c.drawRoundRect(new RectF(50, 148, 99, 220), 22, 22, paint);
        c.drawRoundRect(new RectF(174, 148, 223, 220), 22, 22, paint);
        paint.setShader(null);

        paint.setColor(0xFF080A0E);
        c.drawOval(new RectF(116, 144, 156, 184), paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(3);
        paint.setColor(GOLD);
        c.drawOval(new RectF(116, 144, 156, 184), paint);

        paint.setStyle(Paint.Style.FILL);
        paint.setColor(GOLD_LIGHT);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTextSize(18);
        paint.setFakeBoldText(true);
        c.drawText("3B", 136, 170, paint);
        paint.setFakeBoldText(false);
    }

    private void drawHead(Canvas c, String mode, long now) {
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(whiteGradient());
        c.drawRoundRect(new RectF(54, 14, 220, 146), 70, 70, paint);
        paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawRoundRect(new RectF(54, 14, 220, 146), 70, 70, paint);

        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new RadialGradient(115, 58, 120,
                new int[]{0xFF283848, 0xFF0A111B, 0xFF020305}, null, Shader.TileMode.CLAMP));
        c.drawRoundRect(new RectF(68, 30, 206, 129), 54, 54, paint);
        paint.setShader(null);

        drawEar(c, 63, 92);
        drawEar(c, 211, 92);
        drawEyes(c, mode, now);
    }

    private void drawEar(Canvas c, float x, float y) {
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF080B10);
        c.drawCircle(x, y, 19, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawCircle(x, y, 19, paint);
        paint.setColor(BLUE);
        c.drawCircle(x, y, 10, paint);
    }

    private void drawEyes(Canvas c, String mode, long now) {
        float blink = ((now / 3000) % 7 == 0 && (now % 3000) < 120) ? 0.15f : 1f;
        if ("sleep".equals(mode)) blink = 0.12f;
        int eyeColor = "secret".equals(mode) ? GOLD_LIGHT : BLUE;
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(eyeColor);
        paint.setShadowLayer(14, 0, 0, eyeColor);
        c.save();
        c.scale(1f, blink, 108, 87);
        c.drawOval(new RectF(90, 74, 126, 100), paint);
        c.restore();
        c.save();
        c.scale(1f, blink, 168, 87);
        c.drawOval(new RectF(150, 74, 186, 100), paint);
        c.restore();
        paint.clearShadowLayer();

        if ("notification".equals(mode)) {
            paint.setColor(GOLD_LIGHT);
            paint.setTextSize(28);
            paint.setFakeBoldText(true);
            c.drawText("!", 205, 51, paint);
            paint.setFakeBoldText(false);
        }
    }

    private void drawLegs(Canvas c) {
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF090B10);
        c.drawRoundRect(new RectF(76, 218, 126, 279), 17, 17, paint);
        c.drawRoundRect(new RectF(139, 218, 189, 279), 17, 17, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawRoundRect(new RectF(76, 218, 126, 279), 17, 17, paint);
        c.drawRoundRect(new RectF(139, 218, 189, 279), 17, 17, paint);

        paint.setStyle(Paint.Style.FILL);
        paint.setShader(whiteGradient());
        c.drawRoundRect(new RectF(62, 263, 122, 292), 13, 13, paint);
        c.drawRoundRect(new RectF(136, 263, 196, 292), 13, 13, paint);
        paint.setShader(null);
    }

    private void drawFx(Canvas c, String mode, long now) {
        if (!"celebrate".equals(mode) && !"reward".equals(mode) && !"support".equals(mode)) return;
        float pulse = 4f + (float) Math.abs(Math.sin(now / 250.0)) * 5f;
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(GOLD_LIGHT);
        c.drawCircle(28, 182, pulse, paint);
        paint.setColor(BLUE_LIGHT);
        c.drawCircle(230, 146, pulse * .75f, paint);
    }

    private Shader goldGradient() {
        return new LinearGradient(0, 0, 256, 300,
                new int[]{0xFFFFF0B6, 0xFFE8BD64, 0xFF8F5F19, 0xFFFFE19A},
                null, Shader.TileMode.CLAMP);
    }

    private Shader whiteGradient() {
        return new LinearGradient(40, 20, 220, 260,
                new int[]{Color.WHITE, 0xFFD8DBE2, 0xFF777E8D},
                null, Shader.TileMode.CLAMP);
    }
}
