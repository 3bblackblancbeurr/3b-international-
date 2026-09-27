package app.vercel.threebinternational;

/** Pure policy shared by both native surfaces. A static companion owns no frame timer. */
final class CompanionPolicy {
    private CompanionPolicy() {}
    static boolean isMode(String mode) {
        return mode != null && ("idle".equals(mode) || "walk".equals(mode)
                || "sit".equals(mode) || "sleep".equals(mode) || "wake".equals(mode)
                || "clock".equals(mode) || "notification".equals(mode)
                || "reward".equals(mode) || "celebrate".equals(mode)
                || "guardian".equals(mode) || "support".equals(mode) || "secret".equals(mode));
    }
    static String ambientMode(int hour, int minute) {
        if (hour >= 1 && hour < 6) return "sleep";
        if (hour == 6 && minute < 20) return "wake";
        if (minute >= 58 || minute <= 2) return "clock";
        return "idle";
    }
    static boolean lowBattery(int level, int scale, boolean charging) {
        return !charging && level >= 0 && scale > 0 && level / (double) scale <= .20;
    }
    static boolean canWander(boolean visible, boolean motion, boolean lowPower,
            boolean reducedPresence, boolean touching, String mode) {
        return visible && motion && !lowPower && !reducedPresence && !touching
                && ("idle".equals(mode) || "sit".equals(mode));
    }
    static long frameDelay(boolean visible, boolean motion, boolean lowPower,
            boolean reducedPresence, String mode) {
        if (!visible || !motion || lowPower) return -1L;
        if ("sleep".equals(mode)) return 900L;
        if ("walk".equals(mode) || "celebrate".equals(mode) || "notification".equals(mode)) return 34L;
        return reducedPresence ? 400L : 120L;
    }
    static long reactionDuration(String mode) {
        if (mode == null) return 0L;
        switch (mode) {
            case "notification": return 4200L;
            case "celebrate": return 6200L;
            case "reward": return 5600L;
            case "secret": return 8000L;
            case "guardian": case "support": return 5200L;
            case "wake": return 7000L;
            case "clock": return 4800L;
            case "sleep": return 15000L;
            case "sit": return 10000L;
            case "walk": return 4200L;
            default: return 0L;
        }
    }
}
