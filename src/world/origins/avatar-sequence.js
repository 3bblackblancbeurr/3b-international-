import {getWeapon,weaponAction,weaponDefense} from '../arsenal.js';
import {ACTIONS} from './combat.js';
import {FORM_RULES,unlockedForm} from '../arsenal-progression.js';
export function originsCharacterSequence(avatar,xp=0){
 const w=getWeapon(avatar.weapon),a=weaponAction(ACTIONS.light,avatar,xp),form=unlockedForm(avatar.weaponForm,xp);
 return {id:'origins-avatar',title:'L’Éveil de l’Héritage',shots:[
  {id:'identity',duration:4000,camera:'portrait',title:avatar.name+', ton voyage commence.',line:'Ton apparence et tes origines sont libres.',action:'Idle'},
  {id:'silhouette',duration:4000,camera:'full',title:'Ton style, ton héritage',line:'Ta tenue et tes accessoires te suivent dans les huit pays.',action:'Idle'},
  {id:'weapon',duration:5000,camera:'equipment',title:w.name,line:w.description+' Forme '+(form+1)+'.',action:'Idle'},
  {id:'attack',duration:5000,camera:'power',title:'Attaquer au bon moment',line:`Attaque rapide : ${Math.round(a.damage)} dégâts de base, ${a.range.toFixed(1)} m de portée, ${a.cost} endurance.`,action:'Attack'},
  {id:'defense',duration:5000,camera:'full',title:'Préserver une issue',line:`Protection de l’arme : ${Math.round(weaponDefense(avatar)*100)} %. L’esquive coûte 24 endurance ; une esquive réussie ouvre un contre.`,action:'Idle'},
  {id:'limits',duration:5000,camera:'portrait',title:'La maîtrise fait la différence',line:'Une attaque consomme ton endurance. Garde une réserve pour esquiver. Les formes supérieures se débloquent avec ton XP d’aventure.',action:'Idle'},
  {id:'departure',duration:4000,camera:'departure',title:'Huit portes, un monde à faire vivre',line:'Explore, combats, reconstruis et développe ton personnage. Tu peux continuer après les quêtes.',action:'Idle'}
 ]};
}
