export function assetReady(record={}){return record.realAsset===true&&record.validated===true&&record.qaPass===true;}
export function resolveVehicleForRuntime(vehicle,record,{mode='development',proxyFactory=null}={}){
 if(assetReady(record)&&typeof record.modelAsset==='string')return {source:'production',modelAsset:record.modelAsset,vehicle,validation:'final'};
 if(mode==='development'&&proxyFactory)return {source:'proxy',object:proxyFactory(vehicle),vehicle,validation:'development-only'};
 return {source:'missing',vehicle,validation:'blocked'};
}
export function raceAssetGate({playerVehicle,opponents=[],environment,policeUnits=[]}={}){
 const blockers=[];
 if(!assetReady(playerVehicle))blockers.push('player-vehicle');
 opponents.forEach((r,i)=>{if(!assetReady(r))blockers.push(`opponent-${i}`);});
 if(!assetReady(environment))blockers.push('environment');
 policeUnits.forEach((r,i)=>{if(!assetReady(r))blockers.push(`police-${i}`);});
 return {ready:blockers.length===0,blockers};
}
export function openWorldAssetGate({environment,trafficAssets=[],landmarkAssets=[]}={}){
 const blockers=[];if(!assetReady(environment))blockers.push('environment');trafficAssets.forEach((r,i)=>{if(!assetReady(r))blockers.push(`traffic-${i}`);});landmarkAssets.forEach((r,i)=>{if(!assetReady(r))blockers.push(`landmark-${i}`);});return {ready:blockers.length===0,blockers};
}
export function integrationProgress(records={}){const all=[...(records.vehicles||[]),...(records.police||[]),...(records.environments||[])],done=all.filter(assetReady).length;return {done,total:all.length,percent:all.length?Number((done/all.length*100).toFixed(1)):0};}
