// Character Creator capability registry.
// Only entries with available:true may be exposed as active visual controls.
// Future slots describe the expected data contract without pretending an asset exists.
export const FACE_CAPABILITIES=[
 {id:'face',label:'Largeur du visage',available:true,morphs:['FaceWide','FaceNarrow']},
 {id:'jaw',label:'Mâchoire',available:true,morphs:['JawStrong','JawSoft']},
 {id:'nose',label:'Nez',available:true,morphs:['NoseLarge','NoseSmall']},
 {id:'faceHeight',label:'Hauteur du visage',available:false,morphs:['FaceTall','FaceShort']},
 {id:'faceLength',label:'Longueur du visage',available:false,morphs:['FaceLong','FaceCompact']},
 {id:'craniumWidth',label:'Largeur du crâne',available:false,morphs:['CraniumWide','CraniumNarrow']},
 {id:'forehead',label:'Front',available:false,morphs:['ForeheadHigh','ForeheadLow']},
 {id:'temples',label:'Tempes',available:false,morphs:['TemplesWide','TemplesNarrow']},
 {id:'eyeSize',label:'Taille des yeux',available:false,morphs:['EyesLarge','EyesSmall']},
 {id:'eyeSpacing',label:'Espacement des yeux',available:false,morphs:['EyesWide','EyesClose']},
 {id:'eyeTilt',label:'Inclinaison des yeux',available:false,morphs:['EyesUp','EyesDown']},
 {id:'browHeight',label:'Hauteur des sourcils',available:false,morphs:['BrowsHigh','BrowsLow']},
 {id:'browThickness',label:'Épaisseur des sourcils',available:false,morphs:['BrowsThick','BrowsThin']},
 {id:'mouthWidth',label:'Largeur de bouche',available:false,morphs:['MouthWide','MouthNarrow']},
 {id:'upperLip',label:'Lèvre supérieure',available:false,morphs:['UpperLipFull','UpperLipThin']},
 {id:'lowerLip',label:'Lèvre inférieure',available:false,morphs:['LowerLipFull','LowerLipThin']},
 {id:'chinWidth',label:'Largeur du menton',available:false,morphs:['ChinWide','ChinNarrow']},
 {id:'chinProjection',label:'Projection du menton',available:false,morphs:['ChinForward','ChinBack']},
 {id:'cheekbones',label:'Pommettes',available:false,morphs:['CheekbonesHigh','CheekbonesLow']},
 {id:'cheekVolume',label:'Volume des joues',available:false,morphs:['CheeksFull','CheeksHollow']},
 {id:'earSize',label:'Taille des oreilles',available:false,morphs:['EarsLarge','EarsSmall']}
];
export const ACTIVE_FACE_CAPABILITIES=FACE_CAPABILITIES.filter(x=>x.available);

export const HAIR_CATALOG=[
 {id:0,name:'Rasé',available:true,category:'court'},
 {id:1,name:'Coupe courte',available:true,category:'court'},
 {id:2,name:'Chignons',available:true,category:'attaché'},
 {id:3,name:'Raie souple',available:true,category:'moyen'},
 {id:4,name:'Cheveux longs',available:true,category:'long'},
 {id:5,name:'Court texturé',available:true,category:'texturé'},
 {id:6,name:'Crâne rasé · ancien preset barbe',available:true,category:'court',legacyBeard:true},
 ...[
  ['Pixie texturé','court'],['Carré','moyen'],['Ondulé court','ondulé'],['Ondulé long','ondulé'],
  ['Boucles courtes','bouclé'],['Boucles longues','bouclé'],['Crépu court','crépu'],['Crépu volume','crépu'],
  ['Tresses courtes','tresses'],['Tresses longues','tresses'],['Queue attachée','attaché'],['Chignon haut','attaché']
 ].map(([name,category],i)=>({id:7+i,name,category,available:false}))
];

export const BEARD_CATALOG=[
 {id:'none',name:'Aucune',available:true},
 ...['Barbe légère','Barbe courte','Barbe moyenne','Barbe longue','Moustache','Bouc'].map((name,i)=>({id:'future-'+i,name,available:false}))
];

export const FABRIC_CATALOG={
 cotton:{name:'Coton',available:true,roughness:.92},
 linen:{name:'Lin',available:true,roughness:1},
 satin:{name:'Satin',available:true,roughness:.38},
 leather:{name:'Cuir',available:true,roughness:.55},
 denim:{name:'Jean',available:false,roughness:.78,needsMaps:true},
 wool:{name:'Laine',available:false,roughness:.96,needsMaps:true},
 knit:{name:'Maille',available:false,roughness:.95,needsMaps:true},
 velvet:{name:'Velours',available:false,roughness:.88,needsMaps:true},
 technical:{name:'Tissu technique',available:false,roughness:.48,needsMaps:true}
};

export const PATTERN_CATALOG=[
 {id:'uni',name:'Uni',available:true},
 {id:'bandes',name:'Rayures',available:true},
 {id:'damier',name:'Damier',available:true},
 {id:'insigne',name:'Signature 3B',available:true},
 {id:'broderie',name:'Broderie géométrique',available:true},
 {id:'matrix',name:'Matrix 3B',available:true},
 {id:'zellige',name:'Zellige',available:true},
 {id:'tonal',name:'Ton sur ton',available:true},
 {id:'geo',name:'Géométrique premium',available:true}
];

export const WARDROBE_SLOTS=['top','outerwear','pants','shoes','cape','headwear','bag','belt','gloves','jewelry'];
export const COUNTRY_COLLECTIONS=['international','france','algerie','maroc','tunisie','turquie','espagne','italie','estonie'];

export function creatorCapabilities(){
 return {
  face:{available:ACTIVE_FACE_CAPABILITIES.map(x=>x.id),future:FACE_CAPABILITIES.filter(x=>!x.available).map(x=>x.id)},
  hair:{available:HAIR_CATALOG.filter(x=>x.available).length,future:HAIR_CATALOG.filter(x=>!x.available).length},
  beard:{available:BEARD_CATALOG.filter(x=>x.available).map(x=>x.id),future:BEARD_CATALOG.filter(x=>!x.available).map(x=>x.id)},
  fabrics:{available:Object.entries(FABRIC_CATALOG).filter(([,v])=>v.available).map(([id])=>id),future:Object.entries(FABRIC_CATALOG).filter(([,v])=>!v.available).map(([id])=>id)},
  patterns:PATTERN_CATALOG.filter(x=>x.available).map(x=>x.id),
  wardrobeSlots:WARDROBE_SLOTS,
  countries:COUNTRY_COLLECTIONS
 };
}
