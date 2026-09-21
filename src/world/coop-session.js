export const PARTY_SIGNALS=Object.freeze({
 hello:{label:'Bonjour !',category:'social',duration:1600},
 follow:{label:'Suivez-moi',category:'navigation',duration:1800},
 help:{label:'Besoin d’aide',category:'support',duration:2200},
 danger:{label:'Danger ici',category:'warning',duration:2200},
 ready:{label:'Prêt',category:'coordination',duration:1800},
 regroup:{label:'Regroupez-vous',category:'coordination',duration:2200},
 objective:{label:'Objectif ici',category:'mission',duration:2200},
 wait:{label:'Attendez',category:'coordination',duration:1800},
});

export const PARTY_SIGNAL_SET=new Set(Object.keys(PARTY_SIGNALS));

export function validPartySignal(value){return value===null||PARTY_SIGNAL_SET.has(value);}

export function partySignalLabel(value){return PARTY_SIGNALS[value]?.label||null;}

export function partyDistance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));}

export function nearbyPartyMembers(peers,{region,x,z},radius=8,now=performance.now()){
 return (peers||[]).filter(peer=>peer.region===region&&now-(peer.received||0)<4500&&partyDistance(peer,{x,z})<=radius);
}

export function sharedObjectiveState(peers,target,{required=2,radius=5,selfPresent=true,now=performance.now()}={}){
 const nearby=nearbyPartyMembers(peers,target,radius,now),count=nearby.length+(selfPresent?1:0);
 return {required,count,ready:count>=required,members:nearby.map(peer=>peer.id)};
}

export const COOP_PROGRESS_RULE=Object.freeze({
 owner:'Le propriétaire de la mission valide la progression principale.',
 guest:'Les invités peuvent contribuer aux actions partagées sans débloquer automatiquement leur propre campagne.',
 authority:'Une contribution de groupe ne remplace jamais la validation serveur de l’objectif du propriétaire.',
});

export function validateCoopSession(){
 if(Object.keys(PARTY_SIGNALS).length<8)throw Error('Communication de groupe insuffisante');
 if(!PARTY_SIGNALS.danger||!PARTY_SIGNALS.ready||!PARTY_SIGNALS.objective)throw Error('Pings de coordination manquants');
 return true;
}
