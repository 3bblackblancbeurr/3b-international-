import test from 'node:test';
import assert from 'node:assert/strict';
import {HUB_PREMIUM_METRICS,HUB_PREMIUM_DISTRICTS} from '../src/world/hub/premium-platform.js';

const aabbOverlap=(a,b,pad=2)=>{
  const ax=a.w/2+pad,az=a.d/2+pad,bx=b.w/2+pad,bz=b.d/2+pad;
  return Math.abs(a.x-b.x)<ax+bx&&Math.abs(a.z-b.z)<az+bz;
};

test('premium Hub keeps strong vertical hierarchy',()=>{
  assert.ok(HUB_PREMIUM_METRICS.towerHeight>=150);
  assert.ok(HUB_PREMIUM_METRICS.arrivalPlazaRadius>=30);
  assert.ok(HUB_PREMIUM_METRICS.outerBoulevardRadius<HUB_PREMIUM_METRICS.playableRadius);
  assert.ok(HUB_PREMIUM_METRICS.negativeSpaceRatio>=.24&&HUB_PREMIUM_METRICS.negativeSpaceRatio<=.34);
});

test('premium Hub service districts stay inside the central platform',()=>{
  assert.equal(HUB_PREMIUM_DISTRICTS.length,8);
  for(const d of HUB_PREMIUM_DISTRICTS){
    const extent=Math.hypot(d.w/2,d.d/2);
    assert.ok(Math.hypot(d.x,d.z)+extent<=HUB_PREMIUM_METRICS.playableRadius+10,d.id+' dépasse la plateforme');
  }
});

test('premium Hub service volumes preserve usable negative space',()=>{
  for(let i=0;i<HUB_PREMIUM_DISTRICTS.length;i++){
    for(let j=i+1;j<HUB_PREMIUM_DISTRICTS.length;j++){
      assert.equal(aabbOverlap(HUB_PREMIUM_DISTRICTS[i],HUB_PREMIUM_DISTRICTS[j]),false,
        HUB_PREMIUM_DISTRICTS[i].id+' chevauche '+HUB_PREMIUM_DISTRICTS[j].id);
    }
  }
});
