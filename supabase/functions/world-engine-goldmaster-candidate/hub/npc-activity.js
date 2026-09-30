const WEATHER_INDOOR=new Set(['heavy_rain','storm','snow']);
const EVENING_DISTRICTS=new Set(['commerce','community','arena','docks']);
const NIGHT_DISTRICTS=new Set(['docks','archives','broken_circle_tower','innovation']);

const roleText=role=>String(role||'').toLocaleLowerCase('fr');

export function hubNpcActivity(npc,{hour=12,weather='clear',missionState={}}={}){
  const h=((Number(hour)||0)%24+24)%24;
  const district=npc?.district||'heritage_square';
  const activeMission=(npc?.missionIds||[]).find(id=>missionState[id]?.status==='active');
  if(activeMission)return {id:'mission',label:'En mission',detail:npc.shelter?'Suit ta mission à couvert près de son lieu.':'Suit les événements liés à ta mission active.',pace:'focused',indoor:!!npc.shelter};
  if(npc.activity==='entretien du lieu restauré')return {id:'maintenance',label:'Lieu restauré',detail:'Vérifie et entretient les aménagements que ta mission a rendus possibles.',pace:'calm',indoor:!!npc.shelter};
  if(WEATHER_INDOOR.has(weather)&&!['docks','gardens'].includes(district)){
    return {id:'weather-shelter',label:'À couvert',detail:'La météo a déplacé son activité vers un intérieur proche.',pace:'calm',indoor:true};
  }
  if(h>=0&&h<6){
    if(NIGHT_DISTRICTS.has(district))return {id:'night-watch',label:'Service de nuit',detail:'Le quartier fonctionne encore à faible intensité.',pace:'slow',indoor:false};
    return {id:'rest',label:'Repos',detail:'Hors service jusqu’au matin.',pace:'rest',indoor:true};
  }
  if(h<9)return {id:'opening',label:'Ouverture',detail:'Prépare son lieu et échange avec les premiers habitants.',pace:'calm',indoor:false};
  if(h<12)return {id:'work',label:'Activité',detail:'Travaille dans son quartier et répond aux habitants.',pace:'normal',indoor:false};
  if(h<14)return {id:'midday',label:'Pause de quartier',detail:'Reste disponible mais ralentit son activité.',pace:'calm',indoor:false};
  if(h<18)return {id:'work',label:'Activité',detail:'Reprend son rôle principal dans le quartier.',pace:'normal',indoor:false};
  if(h<22&&EVENING_DISTRICTS.has(district))return {id:'evening',label:'Vie du soir',detail:'Participe à l’activité du quartier en soirée.',pace:'lively',indoor:false};
  if(h<22)return {id:'closing',label:'Fin de journée',detail:'Range, ferme ou termine ses derniers échanges.',pace:'slow',indoor:true};
  if(NIGHT_DISTRICTS.has(district))return {id:'night-watch',label:'Service de nuit',detail:'Le quartier fonctionne encore à faible intensité.',pace:'slow',indoor:false};
  return {id:'rest',label:'Repos',detail:'Hors service jusqu’au matin.',pace:'rest',indoor:true};
}

export function hubNpcActivityLine(npc,context={}){
  const activity=hubNpcActivity(npc,context);
  const role=roleText(npc?.role);
  if(activity.id==='maintenance')return 'Le lieu a changé. Je veille maintenant à son entretien pour que les habitants puissent continuer à en profiter.';
  if(activity.id==='rest')return 'Je termine ma journée. La Cité continue même quand certains lieux se taisent.';
  if(activity.id==='weather-shelter')return 'La météo change le rythme du quartier. Je poursuis à couvert.';
  if(activity.id==='opening')return 'Le quartier s’éveille. Je prépare ce qu’il faut avant l’arrivée du monde.';
  if(activity.id==='midday')return 'Je ralentis quelques minutes. C’est souvent là qu’on remarque ce qu’on avait raté.';
  if(activity.id==='evening')return 'Le soir change les usages de la place. Les gens restent plus longtemps et parlent autrement.';
  if(activity.id==='night-watch')return 'La nuit n’arrête pas tout ici. Certains services deviennent même plus importants.';
  if(/mécan|technicien|ingénieur/.test(role))return 'Je vérifie les équipements avant qu’une petite panne devienne un vrai problème.';
  if(/journal|médiatrice|guide/.test(role))return 'Je passe d’un groupe à l’autre pour comprendre ce qui change vraiment dans le quartier.';
  if(/archiv|restauratrice/.test(role))return 'Je classe, compare et restaure ce qui pourrait disparaître si personne ne s’en occupe.';
  if(/marchand|créatrice|artisan/.test(role))return 'Je travaille avec les habitants qui passent aujourd’hui. La demande change avec l’heure.';
  return activity.detail;
}
