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
    private final Shader gold = new LinearGradient(0, 0, 256, 300,
            new int[]{0xFFFFF0B6, 0xFFE8BD64, 0xFF8F5F19, 0xFFFFE19A}, null, Shader.TileMode.CLAMP);
    private final Shader pearl = new LinearGradient(40, 20, 220, 260,
            new int[]{Color.WHITE, 0xFFD8DBE2, 0xFF777E8D}, null, Shader.TileMode.CLAMP);
    private final Shader shadow = new RadialGradient(128, 283, 70,
            new int[]{0x65000000, 0x00000000}, null, Shader.TileMode.CLAMP);
    private final Shader body = new LinearGradient(70, 120, 199, 245,
            new int[]{0xFF141821, BLACK, 0xFF0A0D12}, null, Shader.TileMode.CLAMP);
    private final Shader visor = new RadialGradient(115, 58, 120,
            new int[]{0xFF283848, 0xFF0A111B, 0xFF020305}, null, Shader.TileMode.CLAMP);

    void draw(Canvas canvas, int width, int height, String mode, long nowMs) {
        if (width <= 0 || height <= 0) return;
        // Props use strokes and shadows; never carry those settings into the next frame.
        paint.reset();
        paint.setAntiAlias(true);
        float scale = Math.min(width / 256f, height / 300f);
        float ox = (width - 256f * scale) / 2f;
        float oy = (height - 300f * scale) / 2f;
        canvas.save();
        canvas.translate(ox, oy);
        canvas.scale(scale, scale);

        if ("sit".equals(mode)) {
            canvas.translate(0f, 15f);
            canvas.scale(1f, .92f, 128f, 270f);
        } else if ("sleep".equals(mode)) {
            canvas.translate(-3f, 19f);
            canvas.rotate(-5f, 128f, 245f);
            canvas.scale(.97f, .92f, 128f, 250f);
        }

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
        drawLegs(canvas, mode, nowMs);
        drawFx(canvas, mode, nowMs);
        drawModeProp(canvas, mode, nowMs);
        canvas.restore();
    }

    private void drawShadow(Canvas c) {
        paint.setShader(shadow);
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
        paint.setShader(body);
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
        paint.setShader(visor);
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

    private void drawLegs(Canvas c, String mode, long now) {
        float stride = "walk".equals(mode) ? (float) Math.sin(now / 145.0) * 10f : 0f;
        drawLeg(c, false, stride);
        drawLeg(c, true, -stride);
    }

    private void drawLeg(Canvas c, boolean right, float stride) {
        c.save();
        c.translate(right ? 63f : 0f, stride < 0 ? stride * .25f : 0f);
        c.rotate(stride, 101f, 223f);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF090B10);
        c.drawRoundRect(new RectF(76, 218, 126, 279), 17, 17, paint);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(4);
        paint.setColor(GOLD);
        c.drawRoundRect(new RectF(76, 218, 126, 279), 17, 17, paint);

        paint.setStyle(Paint.Style.FILL);
        paint.setShader(whiteGradient());
        c.drawRoundRect(new RectF(62, 263, 122, 292), 13, 13, paint);
        paint.setShader(null);
        c.restore();
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

    private void drawModeProp(Canvas c, String mode, long now) {
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(null);
        paint.clearShadowLayer();

        if ("sleep".equals(mode)) {
            paint.setColor(BLUE_LIGHT);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setFakeBoldText(true);
            paint.setTextSize(21);
            c.drawText("Z", 205, 55, paint);
            paint.setTextSize(15);
            c.drawText("Z", 224, 37, paint);
            paint.setFakeBoldText(false);
            return;
        }

        if ("wake".equals(mode)) {
            paint.setColor(GOLD_LIGHT);
            paint.setShadowLayer(9, 0, 0, GOLD);
            c.drawCircle(222, 43, 10, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3);
            for (int i = 0; i < 8; i++) {
                double a = Math.PI * 2 * i / 8.0;
                float x1 = 222 + (float) Math.cos(a) * 15;
                float y1 = 43 + (float) Math.sin(a) * 15;
                float x2 = 222 + (float) Math.cos(a) * 23;
                float y2 = 43 + (float) Math.sin(a) * 23;
                c.drawLine(x1, y1, x2, y2, paint);
            }
            paint.clearShadowLayer();
            return;
        }

        if ("clock".equals(mode)) {
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xEE070A0F);
            c.drawCircle(35, 187, 24, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(4);
            paint.setColor(GOLD);
            c.drawCircle(35, 187, 24, paint);
            paint.setColor(GOLD_LIGHT);
            paint.setStrokeCap(Paint.Cap.ROUND);
            c.drawLine(35, 187, 35, 173, paint);
            c.drawLine(35, 187, 47, 194, paint);
            return;
        }

        if ("reward".equals(mode)) {
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xFF15100A);
            c.drawRoundRect(new RectF(16, 220, 78, 260), 7, 7, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(4);
            paint.setColor(GOLD);
            c.drawRoundRect(new RectF(16, 220, 78, 260), 7, 7, paint);
            path.reset();
            path.moveTo(18, 220);
            path.cubicTo(22, 198, 31, 190, 47, 190);
            path.cubicTo(63, 190, 72, 198, 76, 220);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xFF0C0D10);
            c.drawPath(path, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setColor(GOLD_LIGHT);
            c.drawPath(path, paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(GOLD_LIGHT);
            c.drawRect(43, 216, 51, 260, paint);
            return;
        }

        if ("guardian".equals(mode)) {
            path.reset();
            path.moveTo(20, 181);
            path.lineTo(48, 170);
            path.lineTo(76, 181);
            path.lineTo(76, 204);
            path.cubicTo(76, 227, 63, 243, 48, 252);
            path.cubicTo(33, 243, 20, 227, 20, 204);
            path.close();
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xEE070A0F);
            c.drawPath(path, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(4);
            paint.setColor(GOLD);
            c.drawPath(path, paint);
            paint.setColor(BLUE_LIGHT);
            paint.setStrokeWidth(5);
            paint.setStrokeCap(Paint.Cap.ROUND);
            c.drawLine(34, 207, 44, 217, paint);
            c.drawLine(44, 217, 63, 194, paint);
            return;
        }

        if ("support".equals(mode)) {
            path.reset();
            path.moveTo(216, 238);
            path.cubicTo(212, 233, 181, 214, 181, 197);
            path.cubicTo(181, 181, 204, 174, 216, 188);
            path.cubicTo(228, 174, 251, 181, 251, 197);
            path.cubicTo(251, 214, 220, 233, 216, 238);
            path.close();
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(GOLD_LIGHT);
            paint.setShadowLayer(10, 0, 0, GOLD);
            c.drawPath(path, paint);
            paint.clearShadowLayer();
            return;
        }

        if ("secret".equals(mode)) {
            path.reset();
            path.moveTo(66, 69);
            path.cubicTo(78, 28, 104, 8, 137, 8);
            path.cubicTo(172, 8, 198, 30, 210, 70);
            path.cubicTo(184, 47, 157, 39, 136, 39);
            path.cubicTo(111, 39, 87, 49, 66, 69);
            path.close();
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xE9030406);
            c.drawPath(path, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3);
            paint.setColor(GOLD);
            c.drawPath(path, paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(GOLD_LIGHT);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(25);
            paint.setFakeBoldText(true);
            c.drawText("?", 219, 79, paint);
            paint.setFakeBoldText(false);
        }
    }

    private Shader goldGradient() {
        return gold;
    }

    private Shader whiteGradient() {
        return pearl;
    }
}
