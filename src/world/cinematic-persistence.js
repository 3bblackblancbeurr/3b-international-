import {isWorldCinematicKey} from './cinematic-events.js';

// Opening is presentation-only. A memory already has its durable server beacon;
// do not enqueue an unsupported memory:* cinematicSeen action against engine v21.
// The beacon transition itself prevents the memory presentation from replaying.
export function cinematicSeenCommand(event){
 if(!event||event.kind==='world-opening'||event.kind==='memory-fragment')return null;
 if(!isWorldCinematicKey(event.key)||event.key.startsWith('memory:'))return null;
 return {type:'cinematicSeen',key:event.key};
}
