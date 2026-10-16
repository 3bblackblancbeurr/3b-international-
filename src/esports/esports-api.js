import {authClient} from '../loyalty/client.js';
import {safeVideoUrl} from './esports-data.js';

const APPLICATIONS='esports_applications',MEDIA='esports_media',STAFF='esports_staff',BUCKET='esports-videos';
const MAX_VIDEO_BYTES=30*1024*1024;
export function esportsDataNotReady(error){
 const message=String(error?.message||'');
 return ['PGRST205','42P01','does not exist','not found','schema cache'].some(value=>message.toLowerCase().includes(value.toLowerCase()));
}
function throwIfError(response){
 if(response?.error)throw response.error;
 return response?.data;
}
export async function fetchEsportsSnapshot(user){
 // Public video metadata is allowed; candidates are never exposed to the public.
 const published=throwIfError(await authClient.from(MEDIA)
   .select('id,title,game_id,media_url,storage_path,created_at')
   .eq('status','published').order('created_at',{ascending:false}).limit(32))||[];
 if(!user)return {ready:true,staff:false,role:null,published,applications:[],myMedia:[],queueApplications:[],queueMedia:[]};
 const roleRow=throwIfError(await authClient.from(STAFF).select('role').eq('user_id',user.id).maybeSingle());
 const staff=Boolean(roleRow?.role);
 const mine=throwIfError(await authClient.from(APPLICATIONS).select('id,game_id,role,status,created_at')
   .eq('user_id',user.id).order('created_at',{ascending:false}).limit(20))||[];
 const myMedia=throwIfError(await authClient.from(MEDIA).select('id,title,game_id,media_url,storage_path,status,created_at')
   .eq('user_id',user.id).order('created_at',{ascending:false}).limit(20))||[];
 let queueApplications=[],queueMedia=[];
 if(staff){
  queueApplications=throwIfError(await authClient.from(APPLICATIONS)
    .select('id,pseudo,game_id,role,platform,availability,note,status,created_at')
    .order('created_at',{ascending:false}).limit(120))||[];
  queueMedia=throwIfError(await authClient.from(MEDIA)
    .select('id,title,game_id,media_url,storage_path,status,created_at')
    .order('created_at',{ascending:false}).limit(120))||[];
 }
 return {ready:true,staff,role:roleRow?.role||null,published,applications:mine,myMedia,queueApplications,queueMedia};
}
export async function applyToEsports(user,input){
 if(!user?.id)throw Error('Connecte-toi d’abord à ton compte 3B pour candidater.');
 const pseudo=String(input.pseudo||'').trim(),note=String(input.note||'').trim();
 if(pseudo.length<2||pseudo.length>36)throw Error('Choisis un pseudo de 2 à 36 caractères.');
 if(note.length>600)throw Error('Ta présentation dépasse 600 caractères.');
 const item={user_id:user.id,pseudo,game_id:input.game_id,role:input.role,
  platform:input.platform,availability:input.availability,note,status:'pending'};
 throwIfError(await authClient.from(APPLICATIONS).insert(item).select('id').single());
 return true;
}
export async function sendEsportsMedia(user,input){
 if(!user?.id)throw Error('Connecte-toi à ton compte 3B pour proposer un gameplay.');
 const title=String(input.title||'').trim();
 if(title.length<3||title.length>110)throw Error('Titre requis : de 3 à 110 caractères.');
 const file=input.file;
 let path=null,url=null;
 if(file){
  if(!['video/mp4','video/webm'].includes(file.type))throw Error('Seules les vidéos MP4 ou WebM sont acceptées.');
  if(file.size<=0||file.size>MAX_VIDEO_BYTES)throw Error('Vidéo limitée à 30 Mo pour préserver les ressources gratuites.');
  const extension=file.type==='video/webm'?'webm':'mp4';
  path=user.id+'/'+crypto.randomUUID()+'.'+extension;
  throwIfError(await authClient.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'}));
 }else{
  url=safeVideoUrl(input.media_url);
  if(!url)throw Error('Utilise un lien HTTPS YouTube, Twitch ou TikTok valide.');
 }
 try{
  throwIfError(await authClient.from(MEDIA).insert({
   user_id:user.id,title,game_id:input.game_id,media_url:url,storage_path:path,status:'pending'
  }).select('id').single());
 }catch(error){
  if(path)await authClient.storage.from(BUCKET).remove([path]).catch(()=>{});
  throw error;
 }
 return true;
}
export async function moderateEsports(kind,id,status){
 const config=kind==='application'?{table:APPLICATIONS,allowed:['trial','accepted','rejected']}
  :kind==='media'?{table:MEDIA,allowed:['published','rejected']}:null;
 if(!config||!config.allowed.includes(status))throw Error('Décision de modération invalide.');
 return throwIfError(await authClient.from(config.table).update({status}).eq('id',id).select('id,status').single());
}
export async function playableMediaUrl(item){
 if(item.media_url)return safeVideoUrl(item.media_url);
 if(!item.storage_path)return null;
 const {data,error}=await authClient.storage.from(BUCKET).createSignedUrl(item.storage_path,3600);
 if(error)throw error;
 return data?.signedUrl||null;
}
export function getEsportsError(error){
 if(esportsDataNotReady(error))return 'La partie privée du club est préparée mais pas encore activée sur le serveur. Les fonctions de candidature et de publication restent indisponibles pour éviter de perdre tes données.';
 if(error?.code==='23505')return 'Tu as déjà une candidature pour ce jeu. Retrouve son état dans Mes candidatures.';
 if(error?.statusCode===413||String(error?.message||'').includes('maximum'))return 'Fichier trop volumineux pour le stockage gratuit. Utilise un lien vidéo.';
 return String(error?.message||'Le service est momentanément indisponible.');
}
