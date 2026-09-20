/** A late response may never cross an account, close or unmount boundary. */
export function createCityRequestGate() {
 let owner=null, enabled=false, revision=0;
 return {
  scope(nextOwner,nextEnabled=true){
   const next=nextOwner||null,active=!!next&&!!nextEnabled;
   if(owner!==next||enabled!==active){owner=next;enabled=active;revision++;}
  },
  begin(){return enabled?Object.freeze({owner,revision:++revision}):null;},
  accepts(ticket){return !!ticket&&enabled&&ticket.owner===owner&&ticket.revision===revision;},
  invalidate(){revision++;},
 };
}
