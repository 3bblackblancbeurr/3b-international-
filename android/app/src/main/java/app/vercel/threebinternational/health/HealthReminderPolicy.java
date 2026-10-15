package app.vercel.threebinternational.health;

import java.util.Calendar;
import java.util.TimeZone;

/** Pure calendar rules, also tested on the JVM without an Android runtime. */
public final class HealthReminderPolicy {
    private HealthReminderPolicy() {}

    public static boolean validId(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,48}");
    }

    public static boolean validTime(String time) {
        return time != null && time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]");
    }

    public static long nextTime(String time, long now, TimeZone zone) {
        if (!validTime(time)) throw new IllegalArgumentException("Invalid reminder time");
        Calendar next = Calendar.getInstance(zone);
        next.setTimeInMillis(now);
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2)));
        next.set(Calendar.MINUTE, Integer.parseInt(time.substring(3, 5)));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= now) {
            next.setTimeInMillis(now);
            next.add(Calendar.DAY_OF_MONTH, 1);
            next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2)));
            next.set(Calendar.MINUTE, Integer.parseInt(time.substring(3, 5)));
            next.set(Calendar.SECOND, 0);
            next.set(Calendar.MILLISECOND, 0);
        }
        // Calendar handles local DST gaps and timezone changes without fixed 24h math.
        return next.getTimeInMillis();
    }
}
