// Gameplay manifestations of the Oubli, not invented canonical manga guardians.
const profile=(name,hp,speed,windup,recovery,damage,patterns,color,style)=>({name,hp,speed,windup,recovery,damage,patterns,color,style});
export const ENCOUNTERS={
 france:profile('Manifestation de l’Oubli',130,2.9,1.05,1.15,18,[1,0],'#273742','sentinelle'),
 algerie:profile('Oubli · Onde des terrasses',150,2.5,1.25,1.4,22,[1,1,0],'#745b39','sentinelle'),
 maroc:profile('Oubli · Feinte des passages',125,3.3,.95,1.15,17,[0,0,1],'#8c4955','voyageur'),
 tunisie:profile('Oubli · Marée des voiles',135,2.8,1.15,1.3,19,[1,0,1],'#397c94','mystique'),
 espagne:profile('Oubli · Danse de la place',120,3.5,.95,1.25,16,[0,1,0],'#a3653e','voyageur'),
 italie:profile('Oubli · Veille de pierre',170,2.2,1.4,1.55,24,[0,0,1,1],'#53645a','sentinelle'),
 turquie:profile('Oubli · Écho des galeries',140,3,1.1,1.2,20,[1,0,0,1],'#59527e','mystique'),
 estonie:profile('Oubli · Veille des pins',145,2.7,1.2,1.35,21,[0,1,1,0],'#4d6970','sentinelle'),
};
export const encounterProfile=zone=>ENCOUNTERS[zone]||ENCOUNTERS.france;
