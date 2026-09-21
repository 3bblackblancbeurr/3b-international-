import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../../loyalty/client.js';

const ENDPOINT=SUPABASE_URL+'/functions/v1/dada3b';
const ROOM_KEY='3b_dada_online_room_v1';

export async function dadaOnlineRequest(action,body={}){
  const {data:{session}}=await authClient.auth.getSession();
  if(!session)throw Object.assign(new Error('Connecte-toi à ton compte 3B pour jouer en ligne.'),{status:401});

  let response;
  try{
    response=await fetch(ENDPOINT,{
      method:'POST',
      headers:{
        apikey:PUBLIC_KEY,
        Authorization:'Bearer '+session.access_token,
        'Content-Type':'application/json',
      },
      body:JSON.stringify({action,...body}),
      signal:AbortSignal.timeout(16000),
    });
  }catch(error){
    throw Object.assign(new Error(error?.name==='TimeoutError'
      ? 'Le serveur DADA 3B met trop de temps à répondre.'
      : 'Connexion au serveur DADA 3B interrompue.'),{status:0});
  }

  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    throw Object.assign(new Error(data.error||'Action DADA 3B refusée.'),{status:response.status});
  }
  return data;
}

export function rememberDadaRoom(roomId){
  try{
    if(roomId)localStorage.setItem(ROOM_KEY,roomId);
    else localStorage.removeItem(ROOM_KEY);
  }catch{}
}

export function rememberedDadaRoom(){
  try{
    const id=localStorage.getItem(ROOM_KEY);
    return /^[a-f0-9-]{36}$/i.test(id||'')?id:null;
  }catch{return null;}
}

export function subscribeDadaRoom(roomId,onChange,onStatus){
  if(!/^[a-f0-9-]{36}$/i.test(roomId||''))return()=>{};
  const channel=authClient
    .channel('dada-room-'+roomId)
    .on('postgres_changes',{
      event:'UPDATE',
      schema:'public',
      table:'dada_rooms',
      filter:'id=eq.'+roomId,
    },()=>onChange?.())
    .subscribe((status)=>onStatus?.(status));

  return()=>{
    try{authClient.removeChannel(channel);}catch{}
  };
}
