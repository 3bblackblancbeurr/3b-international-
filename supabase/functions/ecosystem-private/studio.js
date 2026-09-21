export const GARMENT_GROUPS={
 'Hauts':['Maillot','Maillot de basket','Maillot de rugby','T-shirt','Polo','Chemise','Débardeur','Top','Crop top','Hoodie','Sweat','Pull','Cardigan','Body'],
 'Bas':['Pantalon','Jogging','Legging','Jean','Cargo','Short','Bermuda','Jupe','Jupe longue'],
 'Tenues complètes':['Ensemble','Survêtement','Robe','Combinaison','Tailleur','Costume','Combishort'],
 'Vestes & manteaux':['Veste','Manteau','Doudoune','Bomber','Blazer','Coupe-vent','Imperméable','Gilet','Parka'],
 'Maroquinerie':['Sac à dos','Sac à main','Sac de voyage','Pochette','Portefeuille','Sac banane','Tote bag','Sac bandoulière','Porte-cartes','Trousse'],
 'Accessoires':['Ceinture','Casquette','Bonnet','Bob','Écharpe','Foulard','Gants','Chaussettes','Cravate'],
 'Sport & détente':['Maillot de bain','Bikini','Brassière','Sous-vêtement','Pyjama','Peignoir'],
 'Chaussures':['Baskets','Bottes','Sandales','Chaussons'],
 'Sur mesure':['Autre pièce']
};
export const GARMENTS=Object.values(GARMENT_GROUPS).flat();
export const MATERIAL_GROUPS={
 'Performance':['Interlock polyester recyclé 150 g/m²','Interlock polyester 165 g/m²','Jacquard technique 155 g/m²','Mesh respirant 135 g/m²','Jersey technique'],
 'Naturelles':['Coton épais','Coton biologique','Jersey de coton','Lin','Chanvre','Laine','Mérinos','Cachemire','Alpaga','Soie','Bambou (viscose)'],
 'Tissages & textures':['Molleton','Denim','Toile','Satin','Maille','Velours','Velours côtelé','Tweed','Popeline','Flanelle','Dentelle','Tulle','Jacquard','Gabardine','Organza','Éponge'],
 'Techniques & synthétiques':['Nylon recyclé','Polyester recyclé','Ripstop','Softshell','Polaire','Néoprène','Élasthanne mélangé','Membrane imperméable','Microfibre','Tissu réfléchissant'],
 'Cuirs & alternatives':['Cuir','Cuir végétal','Cuir recyclé','Daim','Nubuck','Liège','Alternative à base de cactus','Alternative à base de pomme','PU'],
 'Garnitures':['Ouate recyclée','Duvet','Caoutchouc','EVA','Autre matière']
};
export const MATERIALS=Object.values(MATERIAL_GROUPS).flat();
export const CUTS=['Regular','Pro ajustée','Athletic','Oversize','Ajustée','Structurée','Sport','Unisexe','Droite','Large','Évasée','Courte','Longue','Sur mesure'];
export const PATTERNS=['Uni','Bandes latérales','Bande centrale','Chevron poitrine','Diagonal dynamique','Dégradé','Matrix','Topographie','Carte urbaine','Rayures','Monogramme','Géométrique','Camouflage','Floral','Damier'];
export const TECHNIQUES=['Sublimation intégrale','Sublimation','Broderie','Sérigraphie','Impression DTG','Transfert DTF','Flocage','Écusson brodé','Patch tissé','Patch silicone','Jacquard tissé','Intarsia','Tricotage','Tie and dye','Impression numérique','Dorure à chaud','Marquage à chaud','Embossage','Débossage','Gravure laser','Découpe laser','Perforation','Matelassage','Plissé','Smocks','Strass','Appliqué','Coutures contrastées','Thermocollage','Lavage délavé','Autre technique'];

export const JERSEY_SPORTS=['Football','Basketball','Rugby','Esport','Training'];
export const JERSEY_SLEEVES=['Manches courtes','Manches longues','Sans manches'];
export const JERSEY_COLLARS=['Col rond performance','Col V performance','Col V croisé','Col polo moderne','Col officier'];
export const JERSEY_CONSTRUCTIONS=['Raglan performance','Manches montées','Panneaux ergonomiques','Corps sans couture visuelle'];
export const JERSEY_HEMS=['Droit','Dos légèrement allongé','Fentes latérales'];
export const JERSEY_PRINT_METHODS=['Sublimation intégrale','Sublimation + patchs','DTF premium + broderie','Jacquard + broderie'];
export const JERSEY_SIZES=['XS–3XL','2XS–4XL','Junior + adulte','Sur mesure'];
export const JERSEY_LOGO_PLACEMENTS=['3B officiel · droite visuelle','3B officiel · centre poitrine','Sans logo 3B'];
export const JERSEY_NUMBER_STYLES=['Bloc sportif','Condensé premium','Outline double','Digital Matrix','Sans numéro'];
export const JERSEY_PRESETS={
 'Stadium Noir':{jerseySport:'Football',cut:'Pro ajustée',sleeve:'Manches courtes',collar:'Col V croisé',construction:'Raglan performance',pattern:'Diagonal dynamique',color:'#080b0d',secondary:'#151d23',accent:'#d7b96f',material:'Interlock polyester recyclé 150 g/m²',printMethod:'Sublimation intégrale'},
 'Matrix Bleu':{jerseySport:'Esport',cut:'Athletic',sleeve:'Manches courtes',collar:'Col rond performance',construction:'Panneaux ergonomiques',pattern:'Matrix',color:'#07131c',secondary:'#0e334a',accent:'#d5b66b',material:'Jacquard technique 155 g/m²',printMethod:'Sublimation + patchs'},
 'Heritage Blanc':{jerseySport:'Football',cut:'Regular',sleeve:'Manches courtes',collar:'Col polo moderne',construction:'Manches montées',pattern:'Bande centrale',color:'#f0f0ea',secondary:'#d9d9d2',accent:'#171b1d',material:'Interlock polyester 165 g/m²',printMethod:'Sublimation + patchs'},
 'Arena Basket':{jerseySport:'Basketball',cut:'Athletic',sleeve:'Sans manches',collar:'Col V performance',construction:'Panneaux ergonomiques',pattern:'Bandes latérales',color:'#0d1115',secondary:'#243442',accent:'#d9bd79',material:'Mesh respirant 135 g/m²',printMethod:'Sublimation intégrale'},
 'Rugby Heritage':{jerseySport:'Rugby',cut:'Athletic',sleeve:'Manches courtes',collar:'Col officier',construction:'Raglan performance',pattern:'Rayures',color:'#101517',secondary:'#29353b',accent:'#d7b76d',material:'Interlock polyester 165 g/m²',printMethod:'Sublimation + patchs'}
};

export const DEFAULT_DESIGN={
 garment:'Maillot',material:'Interlock polyester recyclé 150 g/m²',cut:'Pro ajustée',pattern:'Diagonal dynamique',
 color:'#080b0d',secondary:'#151d23',accent:'#d7b96f',placement:'Poitrine',view:'Face',
 techniques:['Sublimation intégrale'],customGarment:'',customMaterial:'',customTechnique:'',personalization:'',
 jerseySport:'Football',sleeve:'Manches courtes',collar:'Col V croisé',construction:'Raglan performance',hem:'Dos légèrement allongé',
 printMethod:'Sublimation intégrale',sizeRange:'XS–3XL',logoPlacement:'3B officiel · droite visuelle',
 teamName:'3B INTERNATIONAL',playerName:'',playerNumber:'',frontSponsor:'',sleeveText:'',hemText:'BLACK BLANC BEUR',
 numberStyle:'Bloc sportif',quantity:50,notes:''
};

export function garmentFamily(garment){return Object.keys(GARMENT_GROUPS).find(g=>GARMENT_GROUPS[g].includes(garment))||'Sur mesure';}
const clean=(value,max=160)=>{const v=value??'';if(typeof v!=='string'||v.length>max||/[\u0000-\u001f]/.test(v))throw Error('Détail invalide.');return v.trim();};
const pick=(value,list,fallback)=>{const v=value===undefined?fallback:value;if(!list.includes(v))throw Error('Option de design invalide.');return v;};

export function validateDesign(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Design invalide.');
 const base={...DEFAULT_DESIGN,...value},result={};
 result.garment=pick(base.garment,GARMENTS,DEFAULT_DESIGN.garment);
 result.material=pick(base.material,MATERIALS,DEFAULT_DESIGN.material);
 result.cut=pick(base.cut,CUTS,DEFAULT_DESIGN.cut);
 result.pattern=pick(base.pattern,PATTERNS,DEFAULT_DESIGN.pattern);
 result.placement=pick(base.placement,['Poitrine','Centre','Dos','Manche','Jambe','Discret','Sans logo'],DEFAULT_DESIGN.placement);
 result.view=pick(base.view,['Face','Dos'],DEFAULT_DESIGN.view);
 for(const key of ['color','secondary','accent']){const v=base[key]??DEFAULT_DESIGN[key];if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Couleur invalide.');result[key]=v.toLowerCase();}
 const techniques=Object.hasOwn(value,'techniques')?value.techniques:[];if(!Array.isArray(techniques)||techniques.length>8||techniques.some(t=>!TECHNIQUES.includes(t)))throw Error('Techniques invalides.');result.techniques=[...new Set(techniques)];
 for(const key of ['customGarment','customMaterial','customTechnique','personalization'])result[key]=clean(base[key],160);
 result.jerseySport=pick(base.jerseySport,JERSEY_SPORTS,DEFAULT_DESIGN.jerseySport);
 result.sleeve=pick(base.sleeve,JERSEY_SLEEVES,DEFAULT_DESIGN.sleeve);
 result.collar=pick(base.collar,JERSEY_COLLARS,DEFAULT_DESIGN.collar);
 result.construction=pick(base.construction,JERSEY_CONSTRUCTIONS,DEFAULT_DESIGN.construction);
 result.hem=pick(base.hem,JERSEY_HEMS,DEFAULT_DESIGN.hem);
 result.printMethod=pick(base.printMethod,JERSEY_PRINT_METHODS,DEFAULT_DESIGN.printMethod);
 result.sizeRange=pick(base.sizeRange,JERSEY_SIZES,DEFAULT_DESIGN.sizeRange);
 result.logoPlacement=pick(base.logoPlacement,JERSEY_LOGO_PLACEMENTS,DEFAULT_DESIGN.logoPlacement);
 result.numberStyle=pick(base.numberStyle,JERSEY_NUMBER_STYLES,DEFAULT_DESIGN.numberStyle);
 for(const key of ['teamName','playerName','playerNumber','frontSponsor','sleeveText','hemText'])result[key]=clean(base[key],64);
 result.notes=clean(base.notes,1200);
 const q=Number(base.quantity);if(!Number.isInteger(q)||q<1||q>100000)throw Error('Quantité invalide.');result.quantity=q;
 return result;
}

export function designReadiness(value){
 const d=validateDesign(value),checks=[
  {id:'construction',ok:!!(d.sleeve&&d.collar&&d.construction),label:'Construction du maillot définie'},
  {id:'colors',ok:new Set([d.color,d.secondary,d.accent]).size>=2,label:'Palette avec au moins deux couleurs'},
  {id:'identity',ok:!!(d.teamName||d.playerName||d.playerNumber),label:'Identité du maillot renseignée'},
  {id:'production',ok:!!(d.material&&d.printMethod&&d.sizeRange&&d.quantity),label:'Base de production renseignée'}
 ];
 return{ready:checks.every(check=>check.ok),checks};
}

export function textilePrompt(config,idea=''){
 const d=validateDesign(config),extra=String(idea||d.notes||'').trim().slice(0,2000);
 if(d.garment!=='Maillot'){
  const custom=(base,detail)=>detail?base+' ('+detail+')':base;
  return 'Concept de mode 3B International. Pièce : '+custom(d.garment,d.customGarment)+'. Matière : '+custom(d.material,d.customMaterial)+'. Coupe : '+d.cut+'. Motif : '+d.pattern+'. Couleur : '+d.color+'. Accent : '+d.accent+'. Marquage : '+d.placement+'. Vue : '+d.view+'. Techniques : '+(d.techniques.join(', ')||'À définir')+(d.customTechnique?' — '+d.customTechnique:'')+'. Personnalisation : '+(d.personalization||'Sans texte ajouté')+'. '+extra+'\nPhotographie de prototype produit en studio, pièce entière, détails réalistes et finitions soignées, fond uni anthracite. Aucun logo de marque tierce. Réserver une zone propre pour poser le logo officiel 3B sans le redessiner. Ce visuel est un concept : compatibilité matière/technique, patronage, tailles et coût à valider par un atelier avant fabrication.';
 }
 const identity=[
  d.teamName&&('équipe « '+d.teamName+' »'),
  d.playerName&&('nom dos « '+d.playerName+' »'),
  d.playerNumber&&('numéro « '+d.playerNumber+' » style '+d.numberStyle),
  d.frontSponsor&&('sponsor texte « '+d.frontSponsor+' »'),
  d.sleeveText&&('manche « '+d.sleeveText+' »'),
  d.hemText&&('bas « '+d.hemText+' »')
 ].filter(Boolean).join(', ')||'identité minimaliste';
 return [
  '3B INTERNATIONAL — BRIEF TECHNIQUE MAILLOT',
  'Sport / usage : '+d.jerseySport,
  'Construction : '+d.cut+' ; '+d.sleeve+' ; '+d.collar+' ; '+d.construction+' ; bas '+d.hem,
  'Matière : '+d.material+(d.customMaterial?' ('+d.customMaterial+')':''),
  'Graphisme : '+d.pattern+' ; principal '+d.color+' ; secondaire '+d.secondary+' ; accent '+d.accent,
  'Marquage 3B : '+d.logoPlacement+'. Pour la position poitrine droite visuelle, réserver la zone du logo officiel sans le redessiner : repère production 4 cm sous le col et 3,5 cm depuis l’épaule.',
  'Identité : '+identity,
  'Production : '+d.printMethod+' ; tailles '+d.sizeRange+' ; quantité cible '+d.quantity,
  'Techniques complémentaires : '+(d.techniques.join(', ')||'aucune')+(d.customTechnique?' ; '+d.customTechnique:''),
  'Notes : '+(extra||'aucune'),
  '',
  'VISUEL À PRODUIRE : photographie produit premium réaliste d’un vrai maillot fini, vue '+d.view.toLowerCase()+', proportions et coutures crédibles, col et manches conformes, panneaux textiles visibles, micro-texture du tissu, aucun mannequin, fond studio anthracite neutre. Respecter strictement la palette et le graphisme. Ne pas inventer de logo de marque tierce. Pour le logo 3B, conserver une zone nette destinée au logo officiel ; ne pas redessiner un emblème officiel à partir du texte.'
 ].join('\n');
}
