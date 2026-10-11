// These resources belong only to the premium effects. Shared scene geometry
// and cached materials must never be registered in this scope.
export function createPremiumVisualResources({onClear=()=>{}}={}){
 let key,anchor,visuals=[],resources=new Set();
 function clear(){
  for(const visual of visuals)visual.removeFromParent();
  onClear(visuals);
  for(const resource of resources)resource.dispose();
  visuals=[];resources.clear();key=anchor=undefined;
 }
 return{
  own(resource){resources.add(resource);return resource;},
  add(visual){visuals.push(visual);return visual;},
  clear,
  sync(nextKey,nextAnchor,build){
   if(key===nextKey&&anchor===nextAnchor)return false;
   clear();
   try{build();key=nextKey;anchor=nextAnchor;return true;}
   catch(error){clear();throw error;}
  },
 };
}

export function premiumVisualKey({region,color,matrixAura,brokenRing,refuge}){
 return JSON.stringify([region,color??null,!!matrixAura,!!brokenRing,
  refuge?[refuge.id,refuge.x,refuge.z,refuge.y]:null]);
}
