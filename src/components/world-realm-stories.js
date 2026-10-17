import {WORLD_REALMS} from './world-living-data.js';
export const REALM_STORIES=Object.freeze({
 france:{epithet:'La lumière de la Justice',note:'Là où chaque décision laisse une trace et chaque voix mérite d’être entendue.',accent:'celestial'},
 algerie:{epithet:'La force de la Loyauté',note:'Un serment à protéger, des chemins à parcourir et des liens qui traversent les frontières.',accent:'emerald'},
 maroc:{epithet:'L’éclat de la Noblesse',note:'Le courage d’accueillir, la dignité d’avancer et un héritage qui se transmet.',accent:'amber'},
 tunisie:{epithet:'Le souffle du Courage',note:'Oser franchir la porte et trouver la force de construire son propre chemin.',accent:'azure'},
 espagne:{epithet:'Le feu de la Passion',note:'L’énergie des rencontres, des idées et des mondes que l’on imagine ensemble.',accent:'coral'},
 italie:{epithet:'Les voies de l’Espoir',note:'La beauté des possibles commence là où l’on décide de recommencer.',accent:'olive'},
 turquie:{epithet:'La flamme de la Foi',note:'Une conviction qui éclaire le voyage et rappelle ce qui nous rassemble.',accent:'violet'},
 estonie:{epithet:'Les secrets de la Sagesse',note:'Observer, apprendre et comprendre ce que les chemins ont à nous raconter.',accent:'frost'}
});

export function getRealmStory(realmId){
 const realm=WORLD_REALMS.find(item=>item.id===realmId)||WORLD_REALMS[0];
 return {realm,story:REALM_STORIES[realm.id],index:WORLD_REALMS.findIndex(item=>item.id===realm.id)+1};
}

