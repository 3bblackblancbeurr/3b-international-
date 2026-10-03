const READS=new Set(['access','snapshot','life','discover','visit']);
export class CityTransportError extends Error{constructor(message,uncertain=false){super(message);this.name='CityTransportError';this.uncertain=uncertain;}}
export async function sendCityRequest(url,options,{action,fetcher=fetch,signalFactory=()=>AbortSignal.timeout(15000)}={}){
 const read=READS.has(action);
 for(let attempt=0;attempt<(read?2:1);attempt++){
  let response;
  try{response=await fetcher(url,{...options,signal:signalFactory()});}
  catch{if(read&&attempt===0)continue;throw new CityTransportError(read?'Connexion interrompue. Réessaie pour retrouver ta ville.':'La confirmation du serveur n’est pas arrivée. Vérifie la sauvegarde avant de recommencer.',!read);}
  let data;try{data=await response.json();}catch{if(read&&attempt===0)continue;throw new CityTransportError('Réponse du serveur incomplète. Vérifie ta sauvegarde.',!read);}
  if(!response.ok){if(read&&response.status>=500&&attempt===0)continue;throw new CityTransportError(data?.error||'Ville 3B momentanément indisponible.',!read&&response.status>=500);}
  return data;
 }
}
