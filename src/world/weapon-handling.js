// Canonical weapon handling profiles for the open-world avatar.
// Values are visual mount rules only; combat stats remain in arsenal.js.
const r=d=>d*Math.PI/180;
const hand=(bone='hand_r',position=[0,0,0],rotation=[0,0,-90],scale=1)=>({bone,position,rotation:rotation.map(r),scale});
const carry=(bone='spine_02',position=[0.16,0.03,-0.09],rotation=[8,0,145],scale=.92)=>({bone,position,rotation:rotation.map(r),scale});

const ONE_HAND={grip:hand(),holster:carry('pelvis',[.18,.02,-.06],[4,6,154],.94),hold:'oneHand',stow:'hip',drawTime:.22,sheatheTime:.28};
const TWO_HAND={grip:hand('hand_r',[0,-.08,0],[0,0,-84],1),holster:carry('spine_02',[.18,.08,-.12],[8,-6,142],.9),hold:'twoHand',stow:'back',drawTime:.28,sheatheTime:.34};
const DUAL={grip:hand('hand_r',[.01,-.01,0],[0,0,-88],.96),holster:carry('spine_02',[.2,.04,-.13],[6,0,138],.88),hold:'dual',stow:'back',drawTime:.24,sheatheTime:.3};
const OFFHAND={grip:hand('hand_l',[-.02,.01,.02],[0,0,90],.95),holster:carry('spine_02',[-.19,.04,-.13],[-4,0,-140],.9),hold:'offHand',stow:'back',drawTime:.22,sheatheTime:.3};
const BOW={grip:hand('hand_l',[0,.02,.01],[0,0,3],1),holster:carry('spine_02',[-.17,.08,-.12],[0,0,-18],.9),hold:'bow',stow:'back',drawTime:.3,sheatheTime:.36};
const MATERIALIZED={grip:hand('hand_r',[.01,0,.015],[0,0,-88],.95),holster:null,hold:'oneHand',stow:'hidden',drawTime:.14,sheatheTime:.18};

export const WEAPON_HANDLING={
 heritage:{...ONE_HAND,label:'Épée du voyageur'},
 paris:{...TWO_HAND,label:'La Flèche de Paris'},
 romano:{...BOW,label:'L’Arco Romano'},
 tallinn:{...ONE_HAND,label:'Tallinn Zero'},
 bosphore:{...DUAL,label:'La Lame du Bosphore'},
 // Important: Alger is deliberately handheld. It must never use a forearm mount.
 alger:{...ONE_HAND,label:'Lumière d’Alger',grip:hand('hand_r',[.015,-.015,.01],[0,0,-86],.94)},
 carthage:{...TWO_HAND,label:'Héritage de Carthage',grip:hand('hand_r',[0,-.12,.01],[0,0,-82],1)},
 zellige:{...OFFHAND,label:'Zellige'},
 abanico:{...ONE_HAND,label:'Abanico Rojo',grip:hand('hand_r',[.02,.015,.02],[0,0,-78],.92)},
 scissors:{...DUAL,label:'Ciseaux dissociés'},
 axe:{...TWO_HAND,label:'Hache des bâtisseurs',grip:hand('hand_r',[0,-.08,.015],[0,0,-80],.98)},
 saber:{...ONE_HAND,label:'Sabre des passages',grip:hand('hand_r',[.015,-.005,.01],[0,0,-86],.98)},
 bow:{...BOW,label:'Arc des horizons'},
 claws:{...MATERIALIZED,label:'Griffes du loup',hold:'dual'},
 wings:{...MATERIALIZED,label:'Ailes de résonance',grip:carry('spine_02',[0,.08,-.11],[0,0,0],1),hold:'body'},
 thread:{...MATERIALIZED,label:'Fil fantôme'}
};

const DEFAULT={...ONE_HAND,label:'Arme 3B'};

export function getWeaponHandling(id){return WEAPON_HANDLING[id]||DEFAULT;}
export function weaponHandlingIds(){return Object.keys(WEAPON_HANDLING);}
