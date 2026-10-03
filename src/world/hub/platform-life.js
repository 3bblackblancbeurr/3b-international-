/** Public places and story are anchored in the hub; rewards remain server-owned. */
import {HUB_SCALE,PLATFORM_DISTRICTS,platformPortal} from './platform-layout.js';
import {COUNTRIES} from '../catalog.js';
import {GUARDIAN_VALUES} from '../guardian-values.js';
export const HUB_DISTRICT_STORIES=Object.freeze({
 heritage_square:{name:'Place des Héritages',story:'Kaïs arrive dans une cité construite par les enfants d’ouvriers. Maël t’apprend à rencontrer ses habitants, prendre le train et retrouver la place.',missions:['first_steps','voices_square'],services:['heritage_welcome','mission_hotel']},
 broken_circle_tower:{name:'Cercle Brisé',story:'Le Monstre de l’Oubli a séparé huit valeurs. Les fragments rendent leur mémoire aux habitants. Noah cherche les fréquences qui maintiennent la cité debout.',missions:['eight_signals'],services:['tower_circle']},
 archives:{name:'Archives de la Mémoire',story:'Inès conserve les souvenirs que l’Oubli tente d’effacer. Une voix enregistrée à l’envers relie les archives à une mémoire engloutie.',missions:['first_echo','broken_record','three_reflections'],services:['memory_archives','living_cards_gallery']},
 arena:{name:'Esplanade de l’Arène',story:'Le courage s’apprend sans détruire la cité. Hugo prépare les voyageurs aux parcours de mobilité ; Sofia enseigne la maîtrise sous pression.',missions:['rooftops_circle','passion_trial'],services:['arena_3b','mobility_center']},
 commerce:{name:'Maison 3B et Manufacture',story:'Noir, blanc, beur : un héritage commun et des identités libres. Les créateurs cherchent un motif que l’Oubli n’arrive pas à reproduire.',missions:['golden_pattern','living_fabric'],services:['house_3b','garage_3b']},
 community:{name:'Maison des Liens',story:'Une cité tient par les personnes qui s’entraident. Les désaccords se résolvent en écoutant plusieurs voix et en vérifiant leurs preuves.',missions:['voices_square'],services:['community_house']},
 innovation:{name:'Ateliers Matrix',story:'Les ateliers transforment la mémoire en matière. La panne du réseau bleu menace les relais et les transports ; répare-les avant de reprendre la ligne.',missions:['blue_blackout','silent_cable','living_fabric'],services:['ai_textile_lab','mode3_studio']},
 docks:{name:'Port des Nuages',story:'Un bateau sans pavillon transporte une trace du Cercle. Le Conducteur garde le secret du huitième wagon. Chaque départ doit avoir un retour.',missions:['boat_without_flag','wagon_eight','storm_rescue','memory_under_water'],services:['central_marina','shipyard_3b','train_station']},
 gardens:{name:'Jardins des Ouvriers',story:'Huit graines portent les valeurs de la cité. Écoute les sons du jardin, protège l’animal-signal et retrouve les noms de ceux qui ont construit ce monde.',missions:['eight_seeds','garden_listens','lost_wolf_signal'],services:['workers_memorial','wildlife_refuge']},
 city3b_portal:{name:'Galerie des Bâtisseurs',story:'Ici, la cité raconte sa construction et ses quartiers. Les habitants du hub ont leur propre histoire ; Créer ma Ville conserve sa progression indépendante.',missions:[],services:['city_planning_office','city_gallery']},
});
export const HUB_VALUES=Object.freeze(COUNTRIES.map(c=>GUARDIAN_VALUES[c.id].value));
export function hubDistrictStory(id){return HUB_DISTRICT_STORIES[id]||HUB_DISTRICT_STORIES.heritage_square;}
export function platformWorldState(save){
 const done=id=>save.hub?.missions?.[id]?.claimed===true;
 return {networkRestored:done('blue_blackout'),gardenRestored:done('eight_seeds'),communityUnited:done('voices_square'),workshopRestored:done('living_fabric'),memoryAwakened:done('first_echo'),missionsFinished:Object.values(save.hub?.missions||{}).filter(m=>m.claimed).length};
}
export function hubPublicPlaces(){
 const districts=Object.entries(HUB_DISTRICT_STORIES).map(([district,story])=>({id:'hub:place:'+district,type:'hubPublicPlace',kind:'district',district,name:'Borne · '+story.name,detail:story.story,actions:['use','inspect'],...PLATFORM_DISTRICTS[district],range:4.5}));
 // The core itself is a fountain. Put its public console on the approach promenade.
 districts.find(p=>p.district==='broken_circle_tower').z=28*HUB_SCALE;
 const sites={heritage_square:[0,50],archives:[-96,-52],arena:[95,-50],commerce:[125,0],community:[-95,20],innovation:[0,-125],docks:[0,116],city3b_portal:[80,104],gardens:[-92,64]};
 for(const p of districts)if(sites[p.district]){p.x=sites[p.district][0]*HUB_SCALE;p.z=sites[p.district][1]*HUB_SCALE;}
 const gates=HUB_VALUES.map((value,index)=>{const p=platformPortal(index),len=Math.hypot(p.x,p.z),r=len-18*HUB_SCALE;return {id:'hub:value:'+index,type:'hubPublicPlace',kind:'value',district:'broken_circle_tower',name:'Mémoire de '+value,detail:value+' est un lien à reconstruire : écoute les habitants, accomplis les missions et rapporte les fragments au Cercle.',actions:['use','inspect'],value,index,x:p.x/len*r+Math.cos(index*Math.PI/4)*8*HUB_SCALE,z:p.z/len*r+Math.sin(index*Math.PI/4)*8*HUB_SCALE,range:4.5};});
 return [...districts,...gates];
}
