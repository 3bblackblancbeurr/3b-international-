const speeds=Object.freeze({train:70,boat:38,telepheric:40,zipline:55});
export function hubJourneyDuration(transport,from,to){
 const distance=Math.hypot(to.x-from.x,to.z-from.z);
 return Math.min(18000,Math.max(3000,distance/(speeds[transport]||40)*1000));
}
// A receipt exists only after arrival. Cancelling/rebuilding before arrival
// cannot count a departure as a completed trip or a mission objective.
export function hubJourneyReceipt(ride,now){
 if(!ride||!Number.isFinite(now)||now<ride.started+ride.duration)return null;
 return {type:'hubTransportRide',transport:ride.transport,from:ride.fromDistrict,to:ride.toDistrict,night:ride.night,dateKey:ride.dateKey};
}
