export const GARMENTS=['Maillot','T-shirt','Hoodie','Veste','Pantalon','Ensemble','Robe','Manteau','Sac à dos','Sac à main','Sac de voyage','Pochette','Portefeuille','Ceinture','Casquette'];
export const MATERIALS=['Jersey technique','Coton épais','Molleton','Nylon recyclé','Denim','Cuir','Cuir végétal','Toile','Satin','Maille'];
export const CUTS=['Regular','Oversize','Ajustée','Structurée','Sport','Unisexe'];
export const PATTERNS=['Uni','Matrix','Rayures','Monogramme','Géométrique'];
export const DEFAULT_DESIGN={garment:'Maillot',material:'Jersey technique',cut:'Regular',pattern:'Matrix',color:'#101b26',accent:'#e4c17b',placement:'Poitrine',view:'Face'};
export function validateDesign(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Design invalide.');
 const result={};for(const[key,list]of Object.entries({garment:GARMENTS,material:MATERIALS,cut:CUTS,pattern:PATTERNS,placement:['Poitrine','Centre','Dos'],view:['Face','Dos']})){if(!list.includes(value[key]))throw Error('Option de design invalide.');result[key]=value[key];}
 for(const key of ['color','accent']){if(!/^#[0-9a-f]{6}$/i.test(value[key]))throw Error('Couleur invalide.');result[key]=value[key];}return result;
}
export function textilePrompt(config,idea=''){const d=validateDesign(config);return 'Concept de mode 3B International. Pièce : '+d.garment+'. Matière : '+d.material+'. Coupe : '+d.cut+'. Motif : '+d.pattern+'. Couleur : '+d.color+'. Accent : '+d.accent+'. Marquage : '+d.placement+'. Vue : '+d.view+'. '+String(idea).trim().slice(0,2000)+'\nPhotographie de prototype produit en studio, pièce entière, détails réalistes et finitions soignées, fond uni anthracite. Identité BLACK BLANC BEUR, noir, or et bleu Matrix. Aucun logo de marque tierce. Réserver une zone propre pour poser le logo officiel 3B sans le redessiner. Ce visuel est un concept, pas une fiche de fabrication.';}
