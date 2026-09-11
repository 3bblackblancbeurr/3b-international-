import {frontierState,buildCost} from './frontier.js';
import {CHAPTERS,chapterState} from './chapters.js';
export function parisActivity(save){
 const region=save.region==='hub'?'france':save.region,h=frontierState(save,region),c=chapterState(save,region);
 if(h.activeJob)return{title:'Terminer la livraison',detail:'Les habitants t’attendent sur le lieu indiqué.',target:region+':job:'+h.activeJob};
 if(!c.helped)return {title:region==='france'?'Retrouver Léa':'Retrouver '+CHAPTERS[region].resident.split(',')[0],detail:'Rencontre les habitants pour former tes premiers liens.',target:region+':story'};
 const cost=buildCost(h,'camp');
 if(h.camp===0&&h.wood>=cost.wood&&h.stone>=cost.stone)return {title:'Aménager le refuge',detail:'Entre dans le refuge et construis son premier rang. Ton groupe gagnera 8 vitalité.',target:region+':camp'};
 const resource=!h.harvest.includes('wood')&&h.wood<(cost?.wood||5)?'wood':!h.harvest.includes('stone')&&h.stone<(cost?.stone||3)?'stone':null;
 if(resource)return {title:resource==='wood'?'Récolter du bois':'Récolter de la pierre',detail:'Les matériaux servent à développer les bâtiments du quartier.',target:region+':resource:'+resource};
 if(!h.food)return {title:'Préparer le départ',detail:'Le refuge permet de retrouver une provision lorsque tes réserves sont vides.',target:region+':camp'};
 return {title:h.camp?'Protéger et développer le quartier':'Protéger les environs',detail:'Une victoire entraîne le groupe et renouvelle les récoltes. Reviens ensuite améliorer tes bâtiments.',target:region+':patrol'};
}
