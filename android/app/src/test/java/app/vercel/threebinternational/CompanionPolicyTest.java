package app.vercel.threebinternational;

import org.junit.Test;
import static org.junit.Assert.*;

public class CompanionPolicyTest {
    @Test public void screenOffAndSystemMotionPreferenceStopAllFrames() {
        for (String mode : new String[]{"idle", "walk", "sleep", "notification", "celebrate", "secret"}) {
            assertEquals(-1L, CompanionPolicy.frameDelay(false, true, false, false, mode));
            assertEquals(-1L, CompanionPolicy.frameDelay(true, false, false, false, mode));
            assertEquals(-1L, CompanionPolicy.frameDelay(true, true, true, false, mode));
        }
    }
    @Test public void touchAndSpecialModesKeepCompanionStationary() {
        assertTrue(CompanionPolicy.canWander(true, true, false, false, false, "idle"));
        assertTrue(CompanionPolicy.canWander(true, true, false, false, false, "sit"));
        for (String mode : new String[]{"sleep", "guardian", "secret", "reward", "celebrate", "support"})
            assertFalse(CompanionPolicy.canWander(true, true, false, false, false, mode));
        assertFalse(CompanionPolicy.canWander(true, true, false, false, true, "idle"));
        assertFalse(CompanionPolicy.canWander(true, true, true, false, false, "idle"));
        assertFalse(CompanionPolicy.canWander(true, true, false, true, false, "idle"));
        assertFalse(CompanionPolicy.canWander(false, true, false, false, false, "idle"));
        assertFalse(CompanionPolicy.canWander(true, false, false, false, false, "idle"));
    }
    @Test public void batteryPolicyHandlesUnknownAndScaledLevels() {
        assertTrue(CompanionPolicy.lowBattery(20, 100, false));
        assertTrue(CompanionPolicy.lowBattery(2, 10, false));
        assertFalse(CompanionPolicy.lowBattery(21, 100, false));
        assertFalse(CompanionPolicy.lowBattery(10, 100, true));
        assertFalse(CompanionPolicy.lowBattery(-1, 100, false));
        assertFalse(CompanionPolicy.lowBattery(0, 0, false));
    }
    @Test public void localNightBoundariesAndInvalidModesAreExplicit() {
        assertEquals("idle", CompanionPolicy.ambientMode(0, 30));
        assertEquals("sleep", CompanionPolicy.ambientMode(1, 0));
        assertEquals("sleep", CompanionPolicy.ambientMode(5, 59));
        assertEquals("wake", CompanionPolicy.ambientMode(6, 0));
        assertEquals("idle", CompanionPolicy.ambientMode(6, 20));
        assertEquals("clock", CompanionPolicy.ambientMode(14, 58));
        assertFalse(CompanionPolicy.isMode(null));
        assertFalse(CompanionPolicy.isMode("unknown"));
        assertTrue(CompanionPolicy.isMode("guardian"));
        assertTrue(CompanionPolicy.isMode("secret"));
        assertTrue(CompanionPolicy.reactionDuration("reward") > 0);
        assertTrue(CompanionPolicy.reactionDuration("guardian") > 0);
        assertTrue(CompanionPolicy.reactionDuration("sleep") > 0);
    }
}
