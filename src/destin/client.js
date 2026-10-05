import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
import {MAX_MEDIA_BYTES,MEDIA_TYPES,mediaPath} from './model.js';
export const DESTIN_API_URL = SUPABASE_URL + '/functions/v1/destin-api';
export async function destinRequest(action, payload = {}, expectedUser, options = {}) {
  const {data:{session}} = await authClient.auth.getSession();
  if (!session || (expectedUser && session.user.id !== expectedUser)) throw Error('La session a changé. Reconnecte-toi à ton compte 3B.');
  const timeout = AbortSignal.timeout(30000);
  const response = await fetch(DESTIN_API_URL, {
    method:'POST', headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
    body:JSON.stringify({...payload,action}),
    signal:options.signal ? AbortSignal.any([options.signal,timeout]) : timeout
  });
  const result = await response.json().catch(() => ({}));
  // Do not apply a late response to a different signed-in account.
  const {data:{session:current}} = await authClient.auth.getSession();
  if (current?.user.id !== session.user.id) throw Error('La session a changé. Recharge 3B DESTIN.');
  if (!response.ok) { const error = Error(result.error || '3B DESTIN ne répond pas. Réessaie.'); error.status = response.status; throw error; }
  return result;
}
export async function uploadMedia(file, userId) {
  let type = file?.type || '';
  if (!type && /\.vtt$/i.test(file?.name || '')) type = 'text/vtt';
  if (!file || !Object.hasOwn(MEDIA_TYPES,type) || file.size < 1 || file.size > MAX_MEDIA_BYTES) throw Error('Formats : MP4, WebM, JPG, PNG, WebP ou VTT. Maximum : 50 Mo par fichier.');
  const ticket = await destinRequest('upload',{type,size:file.size},userId);
  const {error} = await authClient.storage.from('destin-media').uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:type,cacheControl:'3600'});
  if (error) throw Error('L’import n’a pas abouti. Vérifie la connexion puis réessaie.');
  const result = await destinRequest('media',{sources:[ticket.source]},userId);
  return {source:ticket.source,url:result.media[ticket.source]};
}
export function sourceUrl(source, media = {}) { return media[source] || (mediaPath(source) ? '' : source || ''); }
export function inspectVideo(url, timeoutMs = 20000) {
  return new Promise((resolve,reject) => {
    if (!url) { reject(Error('Ajoute la vidéo avant de publier.')); return; }
    const video = document.createElement('video');
    let finished = false;
    const done = (error,value) => {
      if (finished) return; finished = true; clearTimeout(timer);
      video.onloadedmetadata = video.onerror = null;
      video.pause(); video.removeAttribute('src'); video.load();
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => done(Error('La vidéo est trop lente ou inaccessible. Réessaie avec un fichier MP4 importé.')),timeoutMs);
    video.preload = 'metadata'; video.muted = true; video.playsInline = true;
    video.onloadedmetadata = () => Number.isFinite(video.duration) && video.duration > 0 && video.videoWidth > 0
      ? done(null,{duration:video.duration,width:video.videoWidth,height:video.videoHeight})
      : done(Error('Ce fichier n’est pas une vidéo lisible.'));
    video.onerror = () => done(Error('Vidéo illisible. Utilise un MP4 H.264 ou un WebM compatible, pas un lien vers une page YouTube ou TikTok.'));
    video.src = url; video.load();
  });
}
