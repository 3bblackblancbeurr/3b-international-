// One short-lived command. Attack taps keep the latest intent; a queued guard is
// protected from attack spam so the player can reliably defend as recovery ends.
const BUFFER_WINDOWS={light:.24,heavy:.24,circle:.24,guard:.34};
export function dodgeVector(x,z,heading){const length=Math.hypot(x,z);return length>.05?{x:x/length,z:z/length}:{x:Math.sin(heading),z:Math.cos(heading)};}
export function createCombatInput(){let pending=null;return {
 queue(kind,now){
  if(!Object.hasOwn(BUFFER_WINDOWS,kind)||!Number.isFinite(now))return false;
  if(pending?.kind==='guard'&&kind!=='guard'&&now<=pending.until)return false;
  pending={kind,until:now+BUFFER_WINDOWS[kind]};return true;
 },
 take(now,busy){if(!pending)return null;if(now>pending.until){pending=null;return null;}if(busy)return null;const kind=pending.kind;pending=null;return kind;},
 clear(){pending=null;}
};}
