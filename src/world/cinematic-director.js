export const CINEMATIC_TIERS={
 major:{duration:7200,letterbox:true,intensity:1,blur:1},
 narrative:{duration:5600,letterbox:true,intensity:.78,blur:.7},
 micro:{duration:3600,letterbox:false,intensity:.58,blur:.35},
};

export const COUNTRY_CINEMA={
 hub:{accent:'#62d8ff',secondary:'#d9bf82',shadow:'#030811',mood:'Héritage',camera:'grand reveal',light:'bleu Matrix + or champagne',vfx:'matrix-gold',rhythm:'slow-build',sound:'legacy'},
 france:{accent:'#70b9ff',secondary:'#dcc58e',shadow:'#06101d',mood:'Justice',camera:'monumental-low',light:'froid architectural + contre-jour or',vfx:'rain-gold',rhythm:'measured',sound:'monumental'},
 algerie:{accent:'#8bcf9a',secondary:'#e6c27f',shadow:'#100d08',mood:'Loyauté',camera:'wide-grounded',light:'minéral solaire + ombres profondes',vfx:'dust-gold',rhythm:'ample',sound:'grounded'},
 maroc:{accent:'#efc47e',secondary:'#77d7ff',shadow:'#100b08',mood:'Noblesse',camera:'architectural-glide',light:'or sculpté + bleu de nuit',vfx:'dust-gold',rhythm:'elegant',sound:'noble'},
 tunisie:{accent:'#74d8f0',secondary:'#efba83',shadow:'#071018',mood:'Courage',camera:'wind-sweep',light:'mer + horizon chaud',vfx:'mist-gold',rhythm:'breath',sound:'wind'},
 turquie:{accent:'#c9a7ff',secondary:'#e4c685',shadow:'#080714',mood:'Foi',camera:'sacred-rise',light:'brume violette + halo or',vfx:'mist-gold',rhythm:'ritual',sound:'sacred'},
 espagne:{accent:'#ff9278',secondary:'#efca88',shadow:'#140809',mood:'Passion',camera:'kinetic-sweep',light:'chaud dramatique + accents bleus',vfx:'ember-gold',rhythm:'pulse',sound:'kinetic'},
 italie:{accent:'#8be7b2',secondary:'#e8cf98',shadow:'#07110d',mood:'Espoir',camera:'elegant-dolly',light:'lumière douce + reflets or',vfx:'bloom-gold',rhythm:'lyrical',sound:'hope'},
 estonie:{accent:'#9feeff',secondary:'#cfc99f',shadow:'#040c12',mood:'Sagesse',camera:'silent-float',light:'bleu boréal + éclat or froid',vfx:'aurora-gold',rhythm:'minimal',sound:'silent'},
};

const KIND_PRESETS={
 'world-opening':{tier:'major',shot:'world-entry-dive',recipe:'world-entry',duration:7800},
 'country-first-entry':{tier:'major',shot:'country-reveal',recipe:'world-reveal',duration:7000},
 'story-alliance':{tier:'narrative',shot:'intimate-orbit',recipe:'character-presence',duration:5200},
 'story-power':{tier:'micro',shot:'power-push',recipe:'matrix-pulse',duration:3900},
 'memory-fragment':{tier:'micro',shot:'fragment-macro',recipe:'fragment-reveal',duration:3200},
 'story-restoration':{tier:'narrative',shot:'heritage-rise',recipe:'restoration',duration:5700},
 'guardian-intro':{tier:'major',shot:'guardian-low',recipe:'guardian-arrival',duration:6500},
 'final-combat-intro':{tier:'major',shot:'boss-reveal',recipe:'boss-arrival',duration:7400},
 'important-combat-result':{tier:'narrative',shot:'victory-or-retreat',recipe:'combat-result',duration:5200},
 'companion-first-bond':{tier:'micro',shot:'character-close',recipe:'bond',duration:3800},
 discovery:{tier:'micro',shot:'place-glide',recipe:'discovery',duration:3300},
 'story-finale':{tier:'major',shot:'circle-reveal',recipe:'finale',duration:7800},
};

export function cinemaProfile(region='hub'){return COUNTRY_CINEMA[region]||COUNTRY_CINEMA.hub;}
export function cinematicSpec(kind,region='hub'){
 const preset=KIND_PRESETS[kind]||{tier:'micro',shot:'soft-push',recipe:'matrix-pulse',duration:3600};
 return {...CINEMATIC_TIERS[preset.tier],...preset,profile:cinemaProfile(region)};
}
export function cinematicCssVars(presentation){
 const p=presentation?.profile||cinemaProfile(presentation?.region);
 return {'--cinema-accent':p.accent,'--cinema-secondary':p.secondary,'--cinema-shadow':p.shadow,'--cinema-intensity':String(presentation?.intensity??.7)};
}
