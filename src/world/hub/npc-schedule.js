const HOME={
 ines_varga:'archives',mael_rivière:'heritage_square',celine_moreau:'archives',samir_benyahia:'docks',lyna_amrane:'docks',
 nora_khelifi:'commerce',hugo_martel:'arena',sofia_vega:'arena',leyla_demir:'innovation',maarja_saar:'gardens',
 giulia_ferri:'gardens',omar_el_fassi:'commerce',amira_mansouri:'community',elio_romano:'city3b_portal',arda_kaya:'innovation',
 evelin_tamm:'gardens',youssef_ben_salem:'docks',lucia_navaro:'community',meryem_alaoui:'commerce',noah_leroux:'broken_circle_tower',
 the_conductor:'docks',kadra_zerrouki:'docks',adrian_sol:'arena',soraya_najem:'community',
};
const SOCIAL=['heritage_square','community','commerce','gardens'];
export function hubDayPart(hour){
 if(hour<6)return 'night';if(hour<9)return 'morning';if(hour<18)return 'day';if(hour<22)return 'evening';return 'night';
}
export function hubNpcSchedule(npcId,{hour=12,day=1,storyProgress=false}={}){
 const home=HOME[npcId]||'heritage_square',part=hubDayPart(hour);
 if(npcId==='the_conductor')return {district:part==='night'?'docks':'archives',activity:part==='night'?'dernier train':'archives du réseau',rare:part!=='night'};
 if(npcId==='noah_leroux')return {district:storyProgress?'broken_circle_tower':part==='evening'?'heritage_square':'broken_circle_tower',activity:storyProgress?'veille des fragments':'observation',rare:false};
 if(part==='night')return {district:home,activity:'repos',rare:false};
 if(part==='morning')return {district:home,activity:'préparation',rare:false};
 if(part==='evening'&&(day===5||day===6))return {district:SOCIAL[(npcId.length+day)%SOCIAL.length],activity:'rencontre publique',rare:false};
 return {district:home,activity:'travail',rare:false};
}
