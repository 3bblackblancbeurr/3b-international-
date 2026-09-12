// One short-lived command; repeated taps replace it rather than stack attacks.
export function dodgeVector(x,z,heading){const length=Math.hypot(x,z);return length>.05?{x:x/length,z:z/length}:{x:Math.sin(heading),z:Math.cos(heading)};}
export function createCombatInput(){let pending=null;return {
 queue(kind,now){if(!['light','heavy','circle'].includes(kind))return false;pending={kind,until:now+.24};return true;},
 take(now,busy){if(!pending)return null;if(now>pending.until){pending=null;return null;}if(busy)return null;const kind=pending.kind;pending=null;return kind;},
 clear(){pending=null;}
};}
