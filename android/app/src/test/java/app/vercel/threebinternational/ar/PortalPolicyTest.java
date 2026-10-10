package app.vercel.threebinternational.ar;
import org.junit.Test;
import static org.junit.Assert.*;
public class PortalPolicyTest {
 @Test public void onlySafeNearbyGroundCanReceivePortal(){
  assertTrue(PortalPolicy.validPlacement(.55f,1f,true));
  for(float distance:new float[]{0,.24f,1.51f,Float.NaN,Float.POSITIVE_INFINITY})assertFalse(PortalPolicy.validPlacement(distance,1f,true));
  assertFalse(PortalPolicy.validPlacement(.55f,0f,true));assertFalse(PortalPolicy.validPlacement(.55f,-1f,true));assertFalse(PortalPolicy.validPlacement(.55f,1f,false));
 }
 @Test public void nearbyWallsDoNotRequireAnUpwardNormal(){
  assertTrue(PortalPolicy.validWallPlacement(.3f,0f,true));assertTrue(PortalPolicy.validWallPlacement(.9f,.1f,true));
  for(float distance:new float[]{.24f,1.51f,Float.NaN})assertFalse(PortalPolicy.validWallPlacement(distance,0f,true));
  assertFalse(PortalPolicy.validWallPlacement(.55f,1f,true));assertFalse(PortalPolicy.validWallPlacement(.55f,0f,false));
  assertFalse(PortalPolicy.validWallPlacement(.55f,Float.NaN,true));
 }
 @Test public void compactPortalFitsAtManualDistance(){assertTrue(PortalPolicy.HEIGHT*PortalPolicy.SMALL_SCALE<.33f);assertTrue(PortalPolicy.MANUAL_DISTANCE<1f);}
 @Test public void futureDrawingTargetsAreBoundedBundledFiles(){assertTrue(PortalPolicy.validImageTarget("drawing-1","drawing-1.png",.2f));assertFalse(PortalPolicy.validImageTarget("drawing-1","../foreign.png",.2f));assertFalse(PortalPolicy.validImageTarget("drawing-1","https://remote/image.jpg",.2f));assertFalse(PortalPolicy.validImageTarget("drawing-1","drawing-1.png",Float.NaN));assertFalse(PortalPolicy.validImageTarget("drawing-1","drawing-1.png",0));}
 @Test public void portalFacesViewerAtPlacementWithoutFollowingLaterMotion(){assertEquals(0f,PortalPolicy.facingYaw(0,2,0,0),.0001f);assertEquals(Math.PI/2,PortalPolicy.facingYaw(2,0,0,0),.0001);}
 @Test public void orientationRemainsRelativeToTheTrackedAnchor(){assertEquals(-Math.PI/2,PortalPolicy.localFacingYaw(0,2,0,0,1,0),.0001);}
 @Test public void staleOrFutureDepthNeverOccludes(){assertTrue(PortalPolicy.freshDepth(1_000_000_000,900_000_000));assertFalse(PortalPolicy.freshDepth(1_000_000_000,700_000_000));assertFalse(PortalPolicy.freshDepth(1_000_000_000,1_000_000_001));assertFalse(PortalPolicy.freshDepth(1_000_000_000,0));}
 @Test public void invalidLightingDoesNotPoisonRendering(){assertEquals(1f,PortalPolicy.lightIntensity(Float.NaN),0f);assertEquals(.35f,PortalPolicy.lightIntensity(0f),0f);assertEquals(1.8f,PortalPolicy.lightIntensity(100f),0f);}
}
