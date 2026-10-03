export const CITY_MAX_LEVEL=100;
export function cityLevelFloor(level){
 const n=Math.max(1,Math.min(CITY_MAX_LEVEL,Math.floor(Number(level)||1)));
 return n<=50?(n-1)*1000:49000+(n-50)*1000+40*(n-50)*(n-49);
}
export function municipalLevelProgress(xp=0){
 const value=Math.max(0,Number.isFinite(Number(xp))?Number(xp):0);
 let level=1;while(level<CITY_MAX_LEVEL&&cityLevelFloor(level+1)<=value)level++;
 const floor=cityLevelFloor(level),next=cityLevelFloor(Math.min(CITY_MAX_LEVEL,level+1));
 return {level,current:value,floor,next,maxLevel:CITY_MAX_LEVEL,remaining:level===CITY_MAX_LEVEL?0:next-value,percent:level===CITY_MAX_LEVEL?100:Math.min(100,(value-floor)/(next-floor)*100)};
}
export function cityMandate(level){return level<=10?'Fondation':level<=25?'Quartiers':level<=50?'Cité':level<=75?'Métropole':'Héritage';}
