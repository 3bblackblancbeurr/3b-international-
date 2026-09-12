import {normalizeRegions,regionalXP,regionalAction} from './regional-life.js';
import {isCountry} from './countries.js';
import {WORLDS} from './data.js';
import {blankAvatar,normalizeAvatar} from '../avatar-rules.js';
import {POINTS,QUESTS,SPAWNS,objective} from './data.js';
import {distance,safePosition,ground} from './space.js';
export const SAVE_VERSION=1;
const FLAGS=['awakened','met','scent','trace','guardian','trial','echo','echo2','defeated','justice','returned','gardenAccepted','seeds','gardenDone','memoryAccepted','memory','memoryDone','secret'];
export function blank(){return {version:SAVE_VERSION,avatar:blankAvatar(),looks:[],zone:'sanctuary',position:{...SPAWNS.sanctuary},flags:{},regions:normalizeRegions(),rewards:[],xp:0,bond:0,hp:100,equipment:'heritage',settings:{sensitivity:1,shake:false,music:.25,effects:.55,quality:'auto',follow:true,zoom:8.5}};}
export function normalize(raw){
 const s=blank();if(!raw||typeof raw!=='object')return s;
 s.avatar=normalizeAvatar(raw.avatar);s.looks=Array.isArray(raw.looks)?raw.looks.slice(0,6).map(normalizeAvatar):[];
 s.zone=raw.zone==='france'||isCountry(raw.zone)?raw.zone:'sanctuary';for(const k of FLAGS)s.flags[k]=raw.flags?.[k]===true;
 s.rewards=QUESTS.map(q=>q.id).filter(id=>Array.isArray(raw.rewards)&&raw.rewards.includes(id));
 s.regions=normalizeRegions(raw.regions);
 s.xp=regionalXP(s.regions)+s.rewards.reduce((sum,id)=>sum+QUESTS.find(q=>q.id===id).reward,0)+(s.flags.secret?15:0);
 s.bond=(s.flags.scent?1:0)+(s.flags.trial?1:0)+(s.flags.secret?1:0);
 s.hp=Math.min(100,Math.max(1,Number(raw.hp)||100));s.position=safePosition(raw.position,s.zone,s.flags);
 s.equipment=['heritage','artisan'].includes(raw.equipment)?raw.equipment:'heritage';
 for(const k of ['music','effects'])s.settings[k]=Math.max(0,Math.min(1,Number.isFinite(raw.settings?.[k])?raw.settings[k]:s.settings[k]));
 s.settings.sensitivity=Math.max(.25,Math.min(2,Number(raw.settings?.sensitivity)||1));s.settings.zoom=Math.max(6,Math.min(12,Number(raw.settings?.zoom)||8.5));
 s.settings.shake=raw.settings?.shake===true;s.settings.follow=raw.settings?.follow!==false;s.settings.quality=['auto','light','high'].includes(raw.settings?.quality)?raw.settings.quality:'auto';
 return s;
}
export function storageKey(uid){return '3b-origins-v1:'+ (uid||'guest');}
export function load(storage,uid){try{return normalize(JSON.parse(storage.getItem(storageKey(uid))));}catch{return blank();}}
export function persist(storage,uid,s){try{const previous=load(storage,uid),next=structuredClone(s);next.flags={...next.flags};next.regions=normalizeRegions(next.regions);for(const [id,r] of Object.entries(previous.regions))if(r.revision>next.regions[id].revision)next.regions[id]=r;for(const k of FLAGS)if(previous.flags[k])next.flags[k]=true;next.rewards=[...new Set([...previous.rewards,...next.rewards])];if(previous.equipment==='artisan')next.equipment='artisan';storage.setItem(storageKey(uid),JSON.stringify(normalize(next)));return true;}catch{return false;}}
function reward(s,id){if(s.rewards.includes(id))return;s.rewards.push(id);s.xp+=QUESTS.find(q=>q.id===id).reward;}
export function act(current,id,context={}){
 const regional=regionalAction(current,id,context);if(regional)return {...regional,objective:objective(regional.save)};
 const s=structuredClone(current),f=s.flags,p=context.position||s.position,near=(key,r=3.2)=>s.zone===POINTS[key].zone&&distance(p,POINTS[key])<r;
 let message='',speaker='',changed=false,cinematic=null;
 const set=(k)=>{if(!f[k]){f[k]=true;changed=true;}};
 if(isCountry(id)&&s.zone==='sanctuary'){const gate=WORLDS.find(w=>w.id===id);if(distance(p,gate)<4){if(!f.awakened)message='Éveille le Cercle Brisé avant de traverser.';else{s.zone=id;s.position={...SPAWNS[id]};changed=true;}}}
 else if(id==='country-return'&&isCountry(s.zone)&&distance(p,{x:0,z:30})<3.2){s.zone='sanctuary';s.position={x:0,z:20};changed=true;}
 else if(id==='circle'&&near('circle')){speaker=s.avatar?.name||'Voyageur';if(f.justice){set('returned');reward(s,'justice-03');message='La Justice retrouve sa place. Les huit portes restent ouvertes : nous avons encore des liens à réparer.';cinematic='returned';}else{set('awakened');message='Le Cercle a perdu ses fragments. Les huit portes répondent. La France garde la première trace de Justice ; les autres quartiers attendent aussi notre visite.';}}
 else if(id==='france'&&s.zone==='sanctuary'&&distance(p,{x:0,z:-29})<4){if(!f.awakened)message='Le Cercle Brisé doit être éveillé au centre du Sanctuaire.';else{s.zone='france';s.position={...SPAWNS.france};changed=true;}}
 else if(id==='arrival'&&near('arrival')){s.zone='sanctuary';s.position={x:0,z:-24};changed=true;}
 else if(id==='resident'&&near('resident')){speaker='Habitante';set('met');message=f.justice?'Les Archives sont ouvertes. On se parle à nouveau. Merci pour ton aide.':'Les Archives gardent nos souvenirs, mais plus personne ne se souvient du chemin. Ton loup semble sentir quelque chose près de la fontaine.';}
 else if(id==='wolf'){
  if(near('trace',8)&&f.met){if(context.wolfAtTarget){set('scent');s.bond=Math.max(1,s.bond);message='Le loup a retrouvé une odeur. Utilise la Vision de Mémoire près de la trace.';}else message='Le loup cherche près de la fontaine…';}
  else if(near('seal',9)&&f.guardian&&!f.trial)message='Le loup rejoint le sceau gauche. Attends qu’il y soit, puis place-toi à droite.';
  else if(near('secret',7))message='Le loup a remarqué un souvenir sous le tilleul. Révèle-le avec la Vision de Mémoire.';
  else message='Le loup te rejoint.';
 }
 else if(id==='trace'&&near('trace')){if(!f.scent)message='Le loup doit d’abord retrouver cette trace.';else if(!context.vision)message='Utilise la Vision de Mémoire pour lire la trace.';else{set('trace');reward(s,'justice-01');speaker='Une voix retrouvée';message='On m’a jugé sans m’écouter. Deux voix, deux plateaux. Le gardien attend devant les Archives.';}}
 else if(id==='guardian'&&near('guardian')){speaker='Gardien de Justice';if(!f.trace)message='Entends d’abord la voix que le quartier a oubliée.';else{set('guardian');message=f.trial?'Les deux témoignages sont à l’intérieur. Ne laisse pas l’Oubli les séparer.':'La Justice ne se porte pas seul. Confie le sceau gauche à ton compagnon. Rejoins ensuite le plateau droit.';}}
 else if(id==='trial'&&near('trial')){if(!f.guardian)message='Rencontre le gardien avant de commencer l’épreuve.';else if(!context.wolfOnSeal)message='Ton compagnon doit tenir le sceau gauche. Demande-lui de le rejoindre.';else{set('trial');s.bond=Math.max(2,s.bond);reward(s,'justice-02');message='Les deux plateaux se répondent. Le sceau des Archives est ouvert.';cinematic='trial';}}
 else if(['echo','echo2'].includes(id)&&near(id)&&f.trial){if(!context.vision)message='Ce témoignage n’apparaît que dans la Vision de Mémoire.';else{set(id);speaker='Mémoire des Archives';message=id==='echo'?'J’ai fermé la porte pour protéger les autres. Personne ne m’a demandé pourquoi.':'J’ai cru qu’on m’abandonnait. Maintenant, j’entends son histoire.';}}
 else if(id==='defeated'&&context.combatVictory&&f.echo&&f.echo2){set('defeated');message='L’Oubli se dissipe. Le fragment attend au fond des Archives.';}
 else if(id==='fragment'&&near('fragment')&&f.defeated){set('justice');message='Justice retrouvée. Le quartier retrouve ses couleurs et ses habitants leurs souvenirs.';cinematic='restored';}
 else if(id==='atelier'&&near('atelier')){speaker='Artisan';if(f.seeds){set('gardenDone');reward(s,'garden');s.equipment='artisan';message='Ces graines vont rendre vie au jardin. J’ai renforcé ta tenue : tes attaques puissantes coûtent moins d’endurance.';}else{set('gardenAccepted');message='Le jardin ouest a survécu à l’Oubli. Rapporte quelques graines, je pourrai replanter cette cour.';}}
 else if(id==='flower'&&near('flower')&&f.gardenAccepted){set('seeds');message='Graines recueillies. Rapporte-les à l’atelier.';}
 else if(id==='refuge'&&near('refuge')){speaker='Habitante du refuge';s.hp=100;changed=true;if(f.memory){set('memoryDone');reward(s,'remembrance');message='C’est bien notre passage… Merci de l’avoir retrouvé. Repose-toi ici quand tu en as besoin.';}else{set('memoryAccepted');message='On se retrouvait autrefois sur le passage haut, derrière la place. Peut-être reste-t-il un souvenir là-haut ?';}}
 else if(id==='memory'&&near('memory')&&f.memoryAccepted){if(!context.vision||ground(p,s.zone)<2)message='Rejoins le passage haut par sa rampe et révèle le souvenir.';else{set('memory');message='Le souvenir des retrouvailles est retrouvé. Rapporte-le à la Maison des souvenirs.';}}
 else if(id==='secret'&&near('secret')&&context.vision){if(!f.secret){set('secret');s.bond++;s.xp+=15;message='Un souvenir caché. Le lien avec ton loup se renforce : sa recherche porte plus loin.';}}
 else if(id==='archive'&&near('archive'))message=f.trial?'Les Archives sont ouvertes. Cherche les deux témoignages avec la Vision de Mémoire.':'Le sceau se dénouera lorsque les deux plateaux seront occupés.';
 return {save:s,changed,message,speaker,cinematic,objective:objective(s)};
}
