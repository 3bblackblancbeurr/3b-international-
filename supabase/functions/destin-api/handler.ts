import type {SupabaseClient} from 'npm:@supabase/supabase-js@2.116.0';
import {validateManifest,validatePoll,collectMedia,mediaPath,safeMedia,MAX_MEDIA_BYTES,MEDIA_TYPES} from '../../../src/destin/model.js';
import {DESTIN_IDENTITY_ACTIONS,getDestinPassportAccess,normalisePassportAccess} from '../../../src/destin/passportIdentity.js';
import {DIRECTOR_ACTIONS,directorCapabilities,validateLockedManifest} from '../../../src/destin/lockedPolicy.js';
const ownerActions = DIRECTOR_ACTIONS;
const allowedActions = new Set(['status','catalog','editor','save','publish','archive','history','start','resume','checkpoint','choose','finish','claim','poll-create','vote','poll-cancel','upload','media','preview']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handleDestin(db:SupabaseClient,userId:string,body:any,send:(data:unknown,status?:number)=>Response) {
  if (!body || typeof body!=='object' || Array.isArray(body) || !allowedActions.has(body.action)) return send({error:'Action non prise en charge.'},400);
  const {action,...payload}=body;
  const [{data:profile,error:profileError},{data:settings,error:settingsError}]=await Promise.all([
    db.from('member_profiles').select('passport_state').eq('user_id',userId).maybeSingle(),
    db.from('control_center_settings').select('owner_user_id').eq('singleton',true).maybeSingle()
  ]);
  if (profileError || settingsError) throw Error('Service configuration unavailable');
  const owner=settings?.owner_user_id===userId;
  if (ownerActions.has(action) && !owner) return send({error:'Le Studio DESTIN est réservé au propriétaire 3B.'},403);
  if (profile?.passport_state!=='active' && !['status','catalog'].includes(action)) return send({error:'Active ton Passeport 3B pour ouvrir cette expérience.',next:'passport'},403);
  let passportAccess=null;
  if(DESTIN_IDENTITY_ACTIONS.has(action) || action==='status' || action==='catalog'){
    try{passportAccess=await getDestinPassportAccess(db,userId);}
    catch(error){
      if(DESTIN_IDENTITY_ACTIONS.has(action))throw error;
      passportAccess=normalisePassportAccess({code:'unavailable'});
    }
  }
  const directorAccess=directorCapabilities(owner);
  // Director privileges authorize the Studio, never a second viewer identity.
  if (DESTIN_IDENTITY_ACTIONS.has(action) && !passportAccess?.allowed) return send({error:passportAccess?.message,code:passportAccess?.code,next:'passport',passportAccess},403);
  if (action==='status') return send({owner,directorAccess,version:'1.2.0',maxMediaBytes:MAX_MEDIA_BYTES,passportAccess});
  async function sign(sources:string[],ownOnly=false) {
    const unique=[...new Set(sources.filter(Boolean))];
    if (unique.length>256) throw Error('Too many media references');
    const media:Record<string,string>={},paths:string[]=[];
    for (const source of unique) {
      if (!safeMedia(source)) throw Error('Invalid media source');
      const path=mediaPath(source);
      if (path) { if (ownOnly && !path.startsWith(userId+'/')) throw Error('Media ownership mismatch'); paths.push(path); }
      else media[source]=source;
    }
    if (paths.length) {
      const {data,error}=await db.storage.from('destin-media').createSignedUrls(paths,ownOnly?7200:900);
      if (error) throw error;
      for (const item of data || []) {
        if (item.error || !item.signedUrl || !item.path) throw Error('Media not found');
        media['storage:'+item.path]=item.signedUrl;
      }
    }
    return media;
  }
  if (action==='upload') {
    if (typeof payload.type!=='string' || !Object.hasOwn(MEDIA_TYPES,payload.type) || !Number.isInteger(payload.size) || payload.size<1 || payload.size>MAX_MEDIA_BYTES) return send({error:'MP4, WebM, image ou VTT : 50 Mo maximum par fichier.'},400);
    const extension=(MEDIA_TYPES as Record<string,string>)[payload.type];
    const path=`${userId}/${crypto.randomUUID()}.${extension}`;
    const {data,error}=await db.storage.from('destin-media').createSignedUploadUrl(path,{upsert:false});
    if (error || !data) throw Error('Upload ticket unavailable');
    return send({path,token:data.token,source:'storage:'+path});
  }
  if (action==='media' || action==='preview') {
    const sources=action==='preview'?collectMedia(payload.manifest):payload.sources;
    if (!Array.isArray(sources) || sources.some(v=>typeof v!=='string')) return send({error:'Médias invalides.'},400);
    return send({media:await sign(sources,true)});
  }
  if (action==='publish') {
    const errors=[...validateManifest(payload.manifest),...validateLockedManifest(payload.manifest)];
    if (errors.length) return send({error:errors[0],errors},400);
    await sign(collectMedia(payload.manifest),true);
  }
  if (action==='save' && (!payload.manifest || typeof payload.manifest!=='object' || Array.isArray(payload.manifest) || !Array.isArray(payload.manifest.nodes) || payload.manifest.nodes.length>64)) return send({error:'Projet invalide.'},400);
  if (action==='poll-create') { const error=validatePoll(payload); if(error)return send({error},400); }
  for (const key of ['id','runId','storyId','pollId','requestId']) if (payload[key]!=null && payload[key]!=='' && (typeof payload[key]!=='string' || !uuid.test(payload[key]))) return send({error:'Identifiant de requête invalide.'},400);
  if (['choose','finish','checkpoint'].includes(action) && (!Number.isInteger(payload.step) || payload.step<0 || payload.step>128 || typeof payload.nodeId!=='string')) return send({error:'Position du parcours invalide.'},400);
  if (action==='checkpoint' && !Number.isFinite(payload.position)) return send({error:'Position de lecture invalide.'},400);
  const {data,error}=await db.rpc('destin_command_server',{p_user:userId,p_action:action,p_body:payload,p_owner:owner});
  if (error) {
    console.warn('destin-rpc',action,error.code);
    if(error.message==='DESTIN_PASSPORT_VERIFICATION_REQUIRED')return send({error:'Le statut de ton Passeport a changé. Consulte Mon Passeport avant de poursuivre.',next:'passport'},403);
    return send({error:error.code==='P0001'?error.message:'Cette opération n’a pas abouti. Recharge le parcours et réessaie.'},400);
  }
  const result=data || {};
  if (result.manifest) {
    const nodes=result.manifest.nodes;
    if (!result.run || !Array.isArray(nodes) || nodes.length!==1 || nodes[0].id!==result.run.node_id) throw Error('DESTIN private scene scope invalid');
    result.media=await sign(collectMedia(result.manifest));
  } else if(action==='catalog')result.media=await sign((result.stories || []).map((s:any)=>s.cover).filter(Boolean));
  return send({...result,owner,directorAccess,...(passportAccess?{passportAccess}:{}),serverNow:new Date().toISOString()});
}
