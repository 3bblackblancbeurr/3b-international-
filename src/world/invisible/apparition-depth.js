/** CPU float depth only: never interpret a native GPU buffer as metres. */
export function readApparitionDepth(frame,session,reference){
 try{
  if(session.depthUsage!=='cpu-optimized'||session.depthDataFormat!=='float32')return null;
  const view=frame.getViewerPose(reference)?.views?.[0],depth=view&&frame.getDepthInformation?.(view);
  if(!depth||!Number.isInteger(depth.width)||!Number.isInteger(depth.height)||depth.width<1||depth.height<1||depth.width*depth.height>1024*1024)return null;
  const matrix=Array.from(depth.normDepthBufferFromNormView?.matrix||[]);
  if(matrix.length!==16||!matrix.every(Number.isFinite)||!Number.isFinite(depth.rawValueToMeters)||depth.rawValueToMeters<=0)return null;
  const data=new Float32Array(depth.data);if(data.length!==depth.width*depth.height)return null;
  return {data,width:depth.width,height:depth.height,matrix,scale:depth.rawValueToMeters};
 }catch{return null;}
}
