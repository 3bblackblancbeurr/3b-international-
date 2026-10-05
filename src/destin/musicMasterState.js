export function musicMasterResumeState(snapshot){
  const nodes=snapshot?.manifest?.nodes || [];
  const node=nodes.find(item=>item.id===snapshot?.run?.node_id) || nodes[0] || null;
  if(snapshot?.run?.state==='complete') return {mode:'complete',node};
  if(node?.cinema?.path) return {mode:'branch',node};
  return {mode:'intro',node};
}
