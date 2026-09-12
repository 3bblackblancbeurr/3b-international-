// Fictional 3B equipment. Values below are used by both the UI and combat.
const weapon=(id,name,country,kind,form,description,damage,range,speed,defense,color)=>({id,name,country,kind,form,description,damage,range,speed,defense,color});
export const WEAPONS=[
 weapon('heritage','Épée du voyageur','3b','Épée','Épée accordée','Équilibre sans spécialisation.',1,1,1,0,'#d9bf85'),
 weapon('paris','La Flèche de Paris','france','Lance','Quatre segments','Treillis métallique ; portée élevée, cadence réduite.',.95,1.3,1.12,.02,'#8acbff'),
 weapon('romano','L’Arco Romano','italie','Épée','Arc énergétique','Arches lumineuses ; précision à distance, préparation lente.',1,1.1,1.1,.03,'#7be2ad'),
 weapon('tallinn','Tallinn Zero','estonie','Lame','Lame numérique','Bracelet matérialisé ; cadence rapide, faible protection.',.8,1, .8,0,'#58bfff'),
 weapon('bosphore','La Lame du Bosphore','turquie','Doubles lames','Lame circulaire','Deux croissants ; puissance, récupération lente.',1.15,.95,1.2,.04,'#c9a4fa'),
 weapon('alger','Lumière d’Alger','algerie','Gantelet','Lame lumineuse','Avant-bras lumineux ; très rapide, portée courte.',.8,.75,.75,.02,'#ccecff'),
 weapon('carthage','Héritage de Carthage','tunisie','Lance','Trident','Trois pointes d’énergie ; allonge, cadence réduite.',1.05,1.25,1.2,.03,'#79deda'),
 weapon('zellige','Zellige','maroc','Bouclier','Huit plaques','Mosaïque protectrice ; dégâts réduits.',.72,.9,1.1,.2,'#63c8ba'),
 weapon('abanico','Abanico Rojo','espagne','Éventail','Éventail déployé','Lame repliée ; protection accrue au prix de la puissance.',.85,.9,.9,.12,'#fa777e'),
 weapon('scissors','Ciseaux dissociés','3b','Ciseaux','Lames séparées','Deux lames mobiles ; rapides mais peu protectrices.',.9,.95,.9,0,'#dbb2ed'),
 weapon('axe','Hache des bâtisseurs','3b','Hache','Hache résonante','Fort impact ; préparation lente et coûteuse.',1.4,.85,1.5,.04,'#edb16c'),
 weapon('saber','Sabre des passages','3b','Sabre','Sabre lumineux','Attaques souples ; défense limitée.',1.05,1,.98,.02,'#a6d4ef'),
 weapon('bow','Arc des horizons','3b','Arc','Arc accordé','Longue portée ; armement lent.',.85,1.8,1.65,0,'#a9cf89'),
 weapon('claws','Griffes du loup','3b','Griffes','Griffes spectrales','Au contact ; cadence élevée, risque accru.',.7,.65,.7,0,'#b7d4ed'),
 weapon('wings','Ailes de résonance','3b','Ailes','Plumes lumineuses','Projection d’énergie ; ne permet pas de voler.',.8,1.5,1.4,.05,'#dae9fa'),
 weapon('thread','Fil fantôme','3b','Fil','Fil déployé','Portée étendue ; impact faible et préparation longue.',.7,1.65,1.3,0,'#bc9ceb')
];
export const COMPANIONS=[{id:'silver',name:'Loup argenté',color:'#9da6ad',description:'Pelage argenté. Recherche et maintien des sceaux.'},{id:'sand',name:'Loup des sables',color:'#c7a878',description:'Pelage sable. Même capacité de quête, sans bonus caché.'},{id:'night',name:'Loup nocturne',color:'#586480',description:'Pelage ardoise. Même capacité de quête, sans bonus caché.'}];
export const getWeapon=id=>WEAPONS.find(w=>w.id===id)||WEAPONS[0];
export function weaponAction(base,avatar={},xp=0){const w=getWeapon(avatar.weapon),evolved=avatar.weaponForm===1&&xp>=150;return {...base,damage:base.damage*w.damage*(evolved?.88:1),range:base.range*w.range*(evolved?1.2:1),duration:base.duration*w.speed*(evolved?1.15:1),impact:base.impact*w.speed*(evolved?1.15:1),cost:Math.ceil(base.cost*w.speed)};}
export function weaponDefense(avatar={}){return getWeapon(avatar.weapon).defense;}
