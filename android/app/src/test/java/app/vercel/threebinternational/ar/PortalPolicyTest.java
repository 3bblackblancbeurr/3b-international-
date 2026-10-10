package app.vercel.threebinternational.ar;
import org.junit.Test;
import static org.junit.Assert.*;
public class PortalPolicyTest {
 @Test public void onlySafeNearbyGroundCanReceivePortal(){
  assertTrue(PortalPolicy.validPlacement(2f,1f,true));
  for(float distance:new float[]{0,.64f,5.01f,Float.NaN,Float.POSITIVE_INFINITY})assertFalse(PortalPolicy.validPlacement(distance,1f,true));
  assertFalse(PortalPolicy.validPlacement(2f,0f,true));assertFalse(PortalPolicy.validPlacement(2f,-1f,true));assertFalse(PortalPolicy.validPlacement(2f,1f,false));
 }
 @Test public void portalFacesViewerAtPlacementWithoutFollowingLaterMotion(){assertEquals(0f,PortalPolicy.facingYaw(0,2,0,0),.0001f);assertEquals(Math.PI/2,PortalPolicy.facingYaw(2,0,0,0),.0001);}
 @Test public void staleOrFutureDepthNeverOccludes(){assertTrue(PortalPolicy.freshDepth(1_000_000_000,900_000_000));assertFalse(PortalPolicy.freshDepth(1_000_000_000,700_000_000));assertFalse(PortalPolicy.freshDepth(1_000_000_000,1_000_000_001));assertFalse(PortalPolicy.freshDepth(1_000_000_000,0));}
 @Test public void invalidLightingDoesNotPoisonRendering(){assertEquals(1f,PortalPolicy.lightIntensity(Float.NaN),0f);assertEquals(.35f,PortalPolicy.lightIntensity(0f),0f);assertEquals(1.8f,PortalPolicy.lightIntensity(100f),0f);}
}
