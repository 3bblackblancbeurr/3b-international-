import {referenceResidentMoment} from './reference-city-life.js';
const HOME={
 ines_varga:'archives',mael_rivière:'heritage_square',celine_moreau:'archives',samir_benyahia:'docks',lyna_amrane:'docks',
 nora_khelifi:'commerce',hugo_martel:'arena',sofia_vega:'arena',leyla_demir:'innovation',maarja_saar:'gardens',
 giulia_ferri:'gardens',omar_el_fassi:'commerce',amira_mansouri:'community',elio_romano:'city3b_portal',arda_kaya:'innovation',
 evelin_tamm:'gardens',youssef_ben_salem:'docks',lucia_navaro:'community',meryem_alaoui:'commerce',noah_leroux:'broken_circle_tower',
 the_conductor:'docks',kadra_zerrouki:'docks',adrian_sol:'arena',soraya_najem:'community',
};
const SOCIAL=['heritage_square','community','commerce','gardens'];
const LUNCH=['commerce','gardens','heritage_square','community'];
const seedOf=id=>[...id].reduce((sum,char)=>sum+char.charCodeAt(0),0);
const WORKPLACES=Object.freeze({
 ines_varga:['memory_archives','classe les enregistrements'],mael_rivière:['heritage_welcome','accueille les voyageurs'],celine_moreau:['living_cards_gallery','restaure les souvenirs'],
 samir_benyahia:['central_marina','prépare les navettes'],lyna_amrane:['shipyard_3b','inspecte les moteurs'],nora_khelifi:['house_3b','présente les cartes'],
 hugo_martel:['mobility_center','prépare les parcours'],sofia_vega:['arena_3b','répète les mouvements'],leyla_demir:['ai_textile_lab','vérifie les relais'],
 maarja_saar:['workers_memorial','relève les signaux'],giulia_ferri:['wildlife_refuge','soigne les plantes'],omar_el_fassi:['house_3b','assemble les motifs'],
 amira_mansouri:['community_house','accueille les habitants'],elio_romano:['city_planning_office','étudie les plans'],arda_kaya:['mode3_studio','contrôle le réseau'],
 evelin_tamm:['wildlife_refuge','veille sur les animaux'],youssef_ben_salem:['central_marina','vérifie le matériel de secours'],lucia_navaro:['community_house','prépare les rencontres'],
 meryem_alaoui:['house_3b','travaille les textiles'],noah_leroux:['tower_circle','observe les fréquences'],the_conductor:['train_station','veille sur le dernier départ'],
 kadra_zerrouki:['central_marina','compare les cartes marines'],adrian_sol:['arena_3b','prépare les défis'],soraya_najem:['community_house','recueille les témoignages'],
});
const SHELTER_WEATHER=new Set(['rain','heavy_rain','storm','snow']);
const EVENT_RESPONDERS=Object.freeze({
 train_breakdown:new Set(['the_conductor','samir_benyahia','lyna_amrane','youssef_ben_salem']),
 guardian_projection:new Set(['noah_leroux','ines_varga','celine_moreau','maarja_saar']),
 arena_public_challenge:new Set(['hugo_martel','sofia_vega','adrian_sol']),
 memory_walk:new Set(['ines_varga','celine_moreau','maarja_saar','giulia_ferri','evelin_tamm']),
 city_showcase:new Set(['elio_romano','mael_rivière']),
 workers_ceremony:new Set(['maarja_saar','amira_mansouri','lucia_navaro','noah_leroux']),
 market_night:new Set(['nora_khelifi','omar_el_fassi','meryem_alaoui','mael_rivière']),
});
const EVENT_LABELS=Object.freeze({
 train_breakdown:'intervient sur la panne du réseau',guardian_projection:'rejoint la projection du Gardien',arena_public_challenge:'encadre le défi public',
 memory_walk:'partage un récit pendant la marche mémoire',city_showcase:'présente les projets de la Cité',workers_ceremony:'participe à la cérémonie des travailleurs',market_night:'anime le marché du soir',
});
function residentEvent(npcId,activeEvents=[]){
 if(!Array.isArray(activeEvents))return null;
 return activeEvents.find(event=>EVENT_RESPONDERS[event?.id]?.has(npcId))||null;
}
export function hubDayPart(hour){
 hour=((Number(hour)||0)%24+24)%24;
 if(hour<6)return 'night';if(hour<9)return 'morning';if(hour<18)return 'day';if(hour<22)return 'evening';return 'night';
}
export function hubNpcSchedule(npcId,{hour=12,day=1,storyProgress=false,weather='clear',activeEvents=[]}={}){
 hour=((Number(hour)||0)%24+24)%24;day=Math.max(0,Math.floor(Number(day)||0));
 const home=HOME[npcId]||'heritage_square',part=hubDayPart(hour),seed=seedOf(npcId);
 const [activityBuildingId,job]=WORKPLACES[npcId]||['heritage_welcome','accueille les habitants'];
 const moment=referenceResidentMoment(npcId,{hour,day,weather});
 const routine=(data,label=job)=>({...data,activityBuildingId:data.activityBuildingId===undefined?activityBuildingId:data.activityBuildingId,activityLabel:data.activityLabel|| (data.social?moment?.activityLabel||label:label),activityPlaceId:moment?.placeId||null,socialPartnerId:data.social?moment?.partnerId||null:null});
 const event=residentEvent(npcId,activeEvents);
 if(event){
  const emergency=event.id==='train_breakdown',label=EVENT_LABELS[event.id]||'participe à un événement de la Cité';
  return routine({district:event.district||home,activity:'événement',eventId:event.id,eventEffect:event.effect||'',movementIntent:emergency?'respond':'gather',social:!emergency,rare:false,indoor:false,shelter:false,activityBuildingId:null,activityLabel:label},label);
 }
 if(npcId==='the_conductor')return routine({district:part==='night'?'docks':'archives',activity:part==='night'?'dernier train':'archives du réseau',rare:part!=='night',shelter:SHELTER_WEATHER.has(weather)},'veille sur le dernier départ');
 if(npcId==='noah_leroux')return routine({district:storyProgress||SHELTER_WEATHER.has(weather)?'broken_circle_tower':part==='evening'?'heritage_square':'broken_circle_tower',activity:storyProgress?'veille des fragments':'observation',rare:false,shelter:SHELTER_WEATHER.has(weather),indoor:SHELTER_WEATHER.has(weather)},'observe les fréquences du Cercle');
 if(part==='night')return routine({district:home,activity:'repos',rare:false,indoor:true},'termine sa journée');
 if(SHELTER_WEATHER.has(weather))return routine({district:home,activity:'abri météo',shelter:true,indoor:true,rare:false},job+' à couvert');
 if(part==='morning')return routine({district:home,activity:'préparation',rare:false},'prépare son lieu avant l’ouverture');
 if(hour>=12&&hour<14)return routine({district:LUNCH[(seed+day)%LUNCH.length],activity:'pause de midi',social:true,rare:false},'fait une pause avec le quartier');
 if(part==='evening'&&(day===5||day===6))return routine({district:SOCIAL[(seed+day)%SOCIAL.length],activity:'rencontre publique',social:true,rare:false},'rejoint une rencontre publique');
 if(part==='evening'&&seed%3===0)return routine({district:SOCIAL[(seed+1)%SOCIAL.length],activity:'promenade',social:true,rare:false},'profite de la promenade');
 return routine({district:home,activity:'travail',rare:false});
}
