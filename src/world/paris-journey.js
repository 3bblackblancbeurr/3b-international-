import {frontierState,buildCost} from './frontier.js';
import {chapterState} from './chapters.js';
export function parisActivity(save){
 const h=frontierState(save,'france'),c=chapterState(save,'france');
 if(!c.helped)return {title:'Retrouver Léa',detail:'Rencontre la relieuse pour former tes premiers liens.',target:'france:story'};
 const cost=buildCost(h,'camp');
 if(h.camp===0&&h.wood>=cost.wood&&h.stone>=cost.stone)return {title:'Aménager le refuge',detail:'Entre dans le refuge et construis son premier rang. Ton groupe gagnera 8 vitalité.',target:'france:camp'};
 const resource=!h.harvest.includes('wood')&&h.wood<(cost?.wood||5)?'wood':!h.harvest.includes('stone')&&h.stone<(cost?.stone||3)?'stone':null;
 if(resource)return {title:resource==='wood'?'Récolter du bois':'Récolter de la pierre',detail:'Les matériaux servent à développer les bâtiments du quartier.',target:'france:resource:'+resource};
 if(!h.food)return {title:'Préparer le départ',detail:'Le refuge permet de retrouver une provision lorsque tes réserves sont vides.',target:'france:camp'};
 return {title:h.camp?'Protéger et développer le quartier':'Protéger les environs',detail:'Une victoire entraîne le groupe et renouvelle les récoltes. Reviens ensuite améliorer tes bâtiments.',target:'france:patrol'};
}
