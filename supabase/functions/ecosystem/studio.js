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
 'Naturelles':['Coton épais','Coton biologique','Jersey de coton','Lin','Chanvre','Laine','Mérinos','Cachemire','Alpaga','Soie','Bambou (viscose)'],
 'Tissages & textures':['Molleton','Denim','Toile','Satin','Maille','Velours','Velours côtelé','Tweed','Popeline','Flanelle','Dentelle','Tulle','Jacquard','Gabardine','Organza','Éponge'],
 'Techniques & synthétiques':['Jersey technique','Nylon recyclé','Polyester recyclé','Mesh respirant','Ripstop','Softshell','Polaire','Néoprène','Élasthanne mélangé','Membrane imperméable','Microfibre','Tissu réfléchissant'],
 'Cuirs & alternatives':['Cuir','Cuir végétal','Cuir recyclé','Daim','Nubuck','Liège','Alternative à base de cactus','Alternative à base de pomme','PU'],
 'Garnitures':['Ouate recyclée','Duvet','Caoutchouc','EVA','Autre matière']
};
export const MATERIALS=Object.values(MATERIAL_GROUPS).flat();
export const CUTS=['Regular','Oversize','Ajustée','Structurée','Sport','Unisexe','Droite','Large','Évasée','Courte','Longue','Sur mesure'];
export const PATTERNS=['Uni','Matrix','Rayures','Monogramme','Géométrique','Dégradé','Camouflage','Floral','Damier'];
export const TECHNIQUES=['Broderie','Sérigraphie','Impression DTG','Transfert DTF','Sublimation','Flocage','Écusson brodé','Patch tissé','Patch silicone','Jacquard tissé','Intarsia','Tricotage','Tie and dye','Impression numérique','Dorure à chaud','Marquage à chaud','Embossage','Débossage','Gravure laser','Découpe laser','Perforation','Matelassage','Plissé','Smocks','Strass','Appliqué','Coutures contrastées','Thermocollage','Lavage délavé','Autre technique'];
export const DEFAULT_DESIGN={garment:'Maillot',material:'Jersey technique',cut:'Regular',pattern:'Matrix',color:'#101b26',accent:'#e4c17b',placement:'Poitrine',view:'Face',techniques:['Sublimation'],customGarment:'',customMaterial:'',customTechnique:'',personalization:''};
export function garmentFamily(garment){return Object.keys(GARMENT_GROUPS).find(g=>GARMENT_GROUPS[g].includes(garment))||'Sur mesure';}
export function validateDesign(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Design invalide.');
 const result={};for(const[key,list]of Object.entries({garment:GARMENTS,material:MATERIALS,cut:CUTS,pattern:PATTERNS,placement:['Poitrine','Centre','Dos','Manche','Jambe','Discret','Sans logo'],view:['Face','Dos']})){if(!list.includes(value[key]))throw Error('Option de design invalide.');result[key]=value[key];}
 for(const key of ['color','accent']){if(typeof value[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(value[key]))throw Error('Couleur invalide.');result[key]=value[key];}
 const techniques=value.techniques??[];if(!Array.isArray(techniques)||techniques.length>8||techniques.some(t=>!TECHNIQUES.includes(t)))throw Error('Techniques invalides.');result.techniques=[...new Set(techniques)];
 for(const key of ['customGarment','customMaterial','customTechnique','personalization']){const v=value[key]??'';if(typeof v!=='string'||v.length>160||/[\u0000-\u001f]/.test(v))throw Error('Détail invalide.');result[key]=v.trim();}
 return result;
}
export function textilePrompt(config,idea=''){
 const d=validateDesign(config),custom=(base,detail)=>detail?base+' ('+detail+')':base;
 return 'Concept de mode 3B International. Pièce : '+custom(d.garment,d.customGarment)+'. Matière : '+custom(d.material,d.customMaterial)+'. Coupe : '+d.cut+'. Motif : '+d.pattern+'. Couleur : '+d.color+'. Accent : '+d.accent+'. Marquage : '+d.placement+'. Vue : '+d.view+'. Techniques : '+(d.techniques.join(', ')||'À définir')+(d.customTechnique?' — '+d.customTechnique:'')+'. Personnalisation : '+(d.personalization||'Sans texte ajouté')+'. '+String(idea).trim().slice(0,2000)+'\nPhotographie de prototype produit en studio, pièce entière, détails réalistes et finitions soignées, fond uni anthracite. Identité BLACK BLANC BEUR, noir, or et bleu Matrix. Aucun logo de marque tierce. Réserver une zone propre pour poser le logo officiel 3B sans le redessiner. Ce visuel est un concept : compatibilité matière/technique, patronage, tailles et coût à valider par un atelier avant fabrication.';
}

