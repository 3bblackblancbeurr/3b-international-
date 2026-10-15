package app.vercel.threebinternational.health;

import org.junit.Test;
import java.time.Instant;
import java.util.TimeZone;
import static org.junit.Assert.*;

public final class HealthReminderPolicyTest {
    private static long at(String iso) { return Instant.parse(iso).toEpochMilli(); }
    @Test public void strictTimesAndIdsRejectMalformedInput() {
        assertTrue(HealthReminderPolicy.validTime("07:05"));
        assertFalse(HealthReminderPolicy.validTime("7:05"));
        assertFalse(HealthReminderPolicy.validTime("24:00"));
        assertFalse(HealthReminderPolicy.validTime("09:60"));
        assertFalse(HealthReminderPolicy.validTime(null));
        assertTrue(HealthReminderPolicy.validId("morning-routine_1"));
        assertFalse(HealthReminderPolicy.validId("../steps"));
        assertFalse(HealthReminderPolicy.validId(""));
        assertFalse(HealthReminderPolicy.validId(null));
    }
    @Test public void nextOccurrenceStaysAtLocalTimeAcrossSpringDst() {
        TimeZone paris = TimeZone.getTimeZone("Europe/Paris");
        assertEquals(at("2026-03-29T06:00:00Z"),
            HealthReminderPolicy.nextTime("08:00", at("2026-03-28T08:00:00Z"), paris));
    }
    @Test public void nextOccurrenceStaysAtLocalTimeAcrossAutumnDst() {
        TimeZone paris = TimeZone.getTimeZone("Europe/Paris");
        assertEquals(at("2026-10-25T07:00:00Z"),
            HealthReminderPolicy.nextTime("08:00", at("2026-10-24T07:00:00Z"), paris));
    }
    @Test public void skippedSpringHourDoesNotShiftFollowingDayRoutine() {
        TimeZone paris = TimeZone.getTimeZone("Europe/Paris");
        assertEquals(at("2026-03-30T00:30:00Z"),
            HealthReminderPolicy.nextTime("02:30", at("2026-03-29T02:45:00Z"), paris));
    }
    @Test public void passedOrExactTimeMovesForwardAndTimezoneIsLocal() {
        assertEquals(at("2026-10-16T06:30:00Z"),
            HealthReminderPolicy.nextTime("08:30", at("2026-10-15T06:30:00Z"), TimeZone.getTimeZone("Europe/Paris")));
        assertEquals(at("2026-10-15T08:30:00Z"),
            HealthReminderPolicy.nextTime("08:30", at("2026-10-15T06:30:00Z"), TimeZone.getTimeZone("UTC")));
    }
}
