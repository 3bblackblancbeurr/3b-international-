function hash(input){
  let value=0;
  for(let i=0;i<input.length;i+=1)value=(Math.imul(value,31)+input.charCodeAt(i))>>>0;
  return value;
}

export function hubNpcPose(item,timeSeconds){
  const seed=hash(item.npcId||item.id||'npc');
  const phase=(seed%628)/100;
  const radius=1.4+((seed>>>8)%220)/100;
  const speed=.12+((seed>>>16)%16)/100;
  const angle=phase+timeSeconds*speed;
  return {
    x:item.homeX??item.x + Math.cos(angle)*radius,
    z:item.homeZ??item.z + Math.sin(angle)*radius,
    heading:angle+Math.PI/2,
  };
}
