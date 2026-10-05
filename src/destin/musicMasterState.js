export function musicMasterResumeState(snapshot){
  const nodes=snapshot?.manifest?.nodes || [];
  const node=nodes.find(item=>item.id===snapshot?.run?.node_id) || nodes[0] || null;
  if(snapshot?.run?.state==='complete') return {mode:'complete',node};
  if(node?.cinema?.path) return {mode:'branch',node};
  return {mode:'intro',node};
}

export function shouldLoopVisual(videoDuration,audioDuration,delayMs=0){
  const video=Number(videoDuration),audio=Number(audioDuration),delay=Math.max(0,Number(delayMs)||0)/1000;
  if(!Number.isFinite(video) || !Number.isFinite(audio) || video<=0 || audio<=0)return false;
  return video+0.25<audio+delay;
}
