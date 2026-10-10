package app.vercel.threebinternational.ar;

/** Shared placement/quality rules, independently testable without camera permissions. */
public final class PortalPolicy {
    public static final float MIN_DISTANCE = 0.25f, MAX_DISTANCE = 1.5f;
    public static final float HEIGHT = 2.25f, RADIUS = 0.82f;
    public static final float MANUAL_DISTANCE = 0.55f, SMALL_SCALE = 0.14f;
    private PortalPolicy() {}
    public static boolean validPlacement(float distance, float normalY, boolean inPolygon) {
        return Float.isFinite(distance) && distance >= MIN_DISTANCE && distance <= MAX_DISTANCE
            && Float.isFinite(normalY) && normalY >= (float)Math.cos(Math.toRadians(20)) && inPolygon;
    }
    public static boolean validWallPlacement(float distance, float normalY, boolean inPolygon) {
        return Float.isFinite(distance) && distance >= MIN_DISTANCE && distance <= MAX_DISTANCE
            && Float.isFinite(normalY) && Math.abs(normalY) <= (float)Math.sin(Math.toRadians(20)) && inPolygon;
    }
    public static boolean validImageTarget(String id, String file, float width) {
        return id != null && id.matches("[a-z0-9-]{1,80}") && file != null && file.matches("[a-z0-9-]{1,80}\\.(png|jpg|jpeg)")
            && Float.isFinite(width) && width >= 0.03f && width <= 2f;
    }
    public static float facingYaw(float cameraX, float cameraZ, float anchorX, float anchorZ) {
        return (float)Math.atan2(cameraX - anchorX, cameraZ - anchorZ);
    }
    public static float localFacingYaw(float cameraX, float cameraZ, float anchorX, float anchorZ, float anchorZx, float anchorZz) {
        return facingYaw(cameraX,cameraZ,anchorX,anchorZ)-(float)Math.atan2(anchorZx,anchorZz);
    }
    public static float lightIntensity(float estimate) {
        return Float.isFinite(estimate) ? Math.max(0.35f, Math.min(1.8f, estimate)) : 1f;
    }
    public static boolean freshDepth(long cameraTimestamp, long depthTimestamp) {
        return depthTimestamp > 0 && cameraTimestamp >= depthTimestamp && cameraTimestamp - depthTimestamp <= 200_000_000L;
    }
}
