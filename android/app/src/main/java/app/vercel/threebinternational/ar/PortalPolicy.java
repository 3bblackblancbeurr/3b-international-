package app.vercel.threebinternational.ar;

/** Shared placement/quality rules, independently testable without camera permissions. */
public final class PortalPolicy {
    public static final float MIN_DISTANCE = 0.65f, MAX_DISTANCE = 5f;
    public static final float HEIGHT = 2.25f, RADIUS = 0.82f;
    private PortalPolicy() {}
    public static boolean validPlacement(float distance, float normalY, boolean inPolygon) {
        return Float.isFinite(distance) && distance >= MIN_DISTANCE && distance <= MAX_DISTANCE
            && Float.isFinite(normalY) && normalY >= (float)Math.cos(Math.toRadians(20)) && inPolygon;
    }
    public static float facingYaw(float cameraX, float cameraZ, float anchorX, float anchorZ) {
        return (float)Math.atan2(cameraX - anchorX, cameraZ - anchorZ);
    }
    public static float lightIntensity(float estimate) {
        return Float.isFinite(estimate) ? Math.max(0.35f, Math.min(1.8f, estimate)) : 1f;
    }
    public static boolean freshDepth(long cameraTimestamp, long depthTimestamp) {
        return depthTimestamp > 0 && cameraTimestamp >= depthTimestamp && cameraTimestamp - depthTimestamp <= 200_000_000L;
    }
}
