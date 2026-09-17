import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';

export async function city3bRequest(action,body={},expectedUser){
  const {data:{session}}=await authClient.auth.getSession();
  if(!session)throw Error('Connecte-toi à ton compte 3B.');
  if(expectedUser&&session.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
  const response=await fetch(`${SUPABASE_URL}/functions/v1/city-3b`,{
    method:'POST',
    headers:{apikey:PUBLIC_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify({action,...body}),
    signal:AbortSignal.timeout(15000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Ville 3B momentanément indisponible.');
  return data;
}

export const CITY_COUNTRIES=['France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie'];
export const CITY_VALUES={France:'Justice','Algérie':'Loyauté',Espagne:'Passion',Maroc:'Noblesse',Italie:'Espoir',Tunisie:'Courage',Turquie:'Foi',Estonie:'Sagesse'};
