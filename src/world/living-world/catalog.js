export const COUNTRY_PORTALS=Object.freeze([
 {code:'france',name:'France',guardian:'Céliane',value:'Justice',gatewayDistrict:'archives',mapAnchor:'north-west-archives',identity:'urban-patrimonial-memory'},
 {code:'algerie',name:'Algérie',guardian:'Yliane',value:'Loyauté',gatewayDistrict:'docks',mapAnchor:'south-east-oasis-terraces',identity:'casbah-atlas-sahara-mediterranean'},
 {code:'maroc',name:'Maroc',guardian:'Naël',value:'Noblesse',gatewayDistrict:'commerce',mapAnchor:'south-west-creative-market',identity:'patios-zellige-medina-gardens'},
 {code:'tunisie',name:'Tunisie',guardian:'Soraya',value:'Courage',gatewayDistrict:'docks',mapAnchor:'east-solar-riviera',identity:'white-blue-coast-desert-solar'},
 {code:'espagne',name:'Espagne',guardian:'Diego',value:'Passion',gatewayDistrict:'arena',mapAnchor:'west-event-plaza',identity:'plazas-arcades-coast-celebration'},
 {code:'italie',name:'Italie',guardian:'Alessio',value:'Espoir',gatewayDistrict:'unity-gardens',mapAnchor:'east-gardens-belvedere',identity:'piazza-loggias-restoration-gardens'},
 {code:'turquie',name:'Turquie',guardian:'Émir',value:'Foi',gatewayDistrict:'innovation',mapAnchor:'north-east-bridge-bazaar',identity:'bridges-domes-bazaar-observatory'},
 {code:'estonie',name:'Estonie',guardian:'Eira',value:'Sagesse',gatewayDistrict:'unity-gardens',mapAnchor:'north-forest-lake',identity:'forest-mist-lake-signals'},
]);

export const HUB_DISTRICTS=Object.freeze([
 {id:'broken-circle',name:'Tour du Cercle Brisé',tier:0,functions:['main-story','fragments','world-state','panorama'],transportModes:['walk','train','cable-car'],minimumContent:{activities:1,missions:2,secrets:1,services:2}},
 {id:'heritage-square',name:'Place de l’Héritage',tier:0,functions:['arrival','orientation','events','tutorial'],transportModes:['walk','train','vehicle'],minimumContent:{activities:3,missions:3,secrets:1,services:3}},
 {id:'archives',name:'Archives de la Mémoire',tier:0,functions:['lore','collection','puzzles','restoration'],transportModes:['walk','train','zipline'],minimumContent:{activities:2,missions:4,secrets:3,services:3}},
 {id:'arena',name:'Arène 3B et Entraînement',tier:1,functions:['combat','mobility','ranking','weapon-trials'],transportModes:['walk','train','vehicle','zipline'],minimumContent:{activities:4,missions:3,secrets:1,services:3}},
 {id:'commerce',name:'Quartier Commerce',tier:1,functions:['shop','craft','customization','economy'],transportModes:['walk','train','vehicle'],minimumContent:{activities:3,missions:4,secrets:2,services:5}},
 {id:'community',name:'Quartier Communauté',tier:1,functions:['groups','cooperation','social-events','exhibitions'],transportModes:['walk','train','vehicle'],minimumContent:{activities:3,missions:3,secrets:1,services:4}},
 {id:'innovation',name:'Quartier Innovation et IA',tier:1,functions:['ia-textile','mode-3-ia','avatar','prototypes'],transportModes:['walk','train','cable-car'],minimumContent:{activities:3,missions:4,secrets:3,services:4}},
 {id:'docks',name:'Docks et Transports',tier:0,functions:['boats','freight','rescue','transport-hub'],transportModes:['walk','train','vehicle','boat','cable-car'],minimumContent:{activities:4,missions:5,secrets:4,services:5}},
 {id:'unity-gardens',name:'Jardins de l’Unité',tier:1,functions:['nature','memorial','fauna','quiet-secrets'],transportModes:['walk','train','boat','cable-car','zipline'],minimumContent:{activities:3,missions:3,secrets:4,services:2}},
 {id:'city-3b',name:'Portail Ville 3B',tier:0,functions:['construction','visits','collection-display','city-progression'],transportModes:['walk','train','boat','vehicle'],minimumContent:{activities:2,missions:2,secrets:1,services:5}},
]);

export const TRANSPORT_NETWORK=Object.freeze({
 train:{id:'3b-express-loop',name:'3B Express',mode:'train',loop:true,features:['direct-destination','panoramic-tour','archive-audio','special-carriage','onboard-mission'],stops:['heritage-square','broken-circle','archives','community','unity-gardens','docks','city-3b','commerce','arena','innovation']},
 boats:{id:'blue-water-loop',name:'Ligne des Reflets',mode:'boat',loop:false,features:['boat-taxi','panoramic-tour','freight-contracts','rescue-missions','hidden-islets'],stops:['docks','city-3b','unity-gardens','heritage-square']},
 cableCars:[{id:'cable-north',from:'heritage-square',to:'innovation',purpose:'vertical-panorama'},{id:'cable-west',from:'docks',to:'broken-circle',purpose:'rapid-ascent'},{id:'cable-gardens',from:'unity-gardens',to:'archives',purpose:'quiet-scenic-link'}],
 ziplines:[{id:'zip-archives',from:'archives',to:'heritage-square',purpose:'tutorial-shortcut'},{id:'zip-arena',from:'arena',to:'commerce',purpose:'mobility-challenge'},{id:'zip-gardens',from:'unity-gardens',to:'docks',purpose:'secret-descent'}],
 vehicleCorridors:[{id:'boulevard-inner',districts:['heritage-square','commerce','arena','community']},{id:'boulevard-outer',districts:['archives','innovation','docks','city-3b','unity-gardens']}],
});

export const MISSION_CATEGORIES=Object.freeze(['main','guardian','district','citizen','secret','dynamic','daily','weekly']);
export const CHARACTER_RARITIES=Object.freeze(['common','rare','epic','legendary','unique','ultra-unique']);
export const POPULATION_PROFILES=Object.freeze({performance:{activeNear:[10,18],simplifiedFar:[20,35]},balanced:{activeNear:[18,30],simplifiedFar:[35,60]},cinema:{activeNear:[30,50],simplifiedFar:[60,100]}});
export const FIRST_SLICE_DISTRICTS=Object.freeze(['heritage-square','broken-circle','archives','commerce','docks','city-3b']);

export function validateLivingWorldCatalog(){
 const errors=[],districtIds=HUB_DISTRICTS.map(d=>d.id),districtSet=new Set(districtIds),portalCodes=COUNTRY_PORTALS.map(p=>p.code),anchors=COUNTRY_PORTALS.map(p=>p.mapAnchor);
 if(COUNTRY_PORTALS.length!==8)errors.push('Le hub doit contenir exactement huit portes pays.');
 if(new Set(portalCodes).size!==portalCodes.length)errors.push('Les codes pays doivent être uniques.');
 if(new Set(anchors).size!==anchors.length)errors.push('Les huit portes doivent être dispersées sur des ancrages uniques.');
 if(new Set(districtIds).size!==districtIds.length)errors.push('Les identifiants de quartiers doivent être uniques.');
 for(const portal of COUNTRY_PORTALS){if(!districtSet.has(portal.gatewayDistrict))errors.push(`Quartier inconnu pour la porte ${portal.code}.`);if(!portal.guardian||!portal.value||!portal.identity)errors.push(`Identité incomplète pour la porte ${portal.code}.`);}
 for(const district of HUB_DISTRICTS){if(!district.transportModes.includes('walk'))errors.push(`${district.id} doit rester accessible à pied.`);if(district.transportModes.length<2)errors.push(`${district.id} doit posséder un transport structurant.`);if(district.functions.length<2)errors.push(`${district.id} doit avoir plusieurs fonctions.`);for(const key of ['activities','missions','secrets','services'])if(district.minimumContent[key]<1)errors.push(`${district.id} doit contenir au moins un élément ${key}.`);}
 for(const stop of [...TRANSPORT_NETWORK.train.stops,...TRANSPORT_NETWORK.boats.stops])if(!districtSet.has(stop))errors.push(`Arrêt de transport inconnu : ${stop}.`);
 if(!TRANSPORT_NETWORK.train.loop)errors.push('Le 3B Express doit former une boucle.');
 if(!TRANSPORT_NETWORK.boats.stops.includes('docks'))errors.push('La ligne maritime doit partir des Docks.');
 for(const district of FIRST_SLICE_DISTRICTS)if(!districtSet.has(district))errors.push(`Quartier de tranche jouable inconnu : ${district}.`);
 return errors;
}
