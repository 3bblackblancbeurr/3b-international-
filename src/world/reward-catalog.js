export const RARITIES=[
 {id:'common',name:'Commun',weight:700000000},
 {id:'rare',name:'Rare',weight:200000000},
 {id:'epic',name:'Épique',weight:70000000},
 {id:'special',name:'Spécial',weight:20000000},
 {id:'ultra-rare',name:'Ultra rare',weight:8000000},
 {id:'legendary',name:'Légendaire',weight:1900000},
 {id:'ultimate',name:'Ultime',weight:99999,supply:8},
 {id:'unique',name:'Unique',weight:1,supply:1},
];
export const REWARD_FAMILIES=['skin','outfit','weapon','companion','vehicle','tool','blueprint','decoration','effect','badge'];
const countries=['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'];
const names={skin:'Skin',outfit:'Tenue',weapon:'Arme',companion:'Compagnon',vehicle:'Véhicule',tool:'Outil',blueprint:'Plan',decoration:'Décoration',effect:'Effet',badge:'Badge'};
export const REWARDS=countries.flatMap((country,ci)=>REWARD_FAMILIES.flatMap((family,fi)=>RARITIES.map((rarity,ri)=>({
 id:`${country}-${family}-${rarity.id}`,country,family,rarity:rarity.id,name:`${names[family]} ${country[0].toUpperCase()+country.slice(1)} · ${rarity.name}`,
 supplyCap:rarity.supply??null,collection:((ci+1)*1000)+fi*10+ri,
}))));
export const rewardById=Object.fromEntries(REWARDS.map(x=>[x.id,x]));
export function rarityForRoll(value){let cursor=0;for(const r of RARITIES){cursor+=r.weight;if(value<cursor)return r;}return RARITIES[0];}
export function validateRarityWeights(){return RARITIES.reduce((n,r)=>n+r.weight,0)===1_000_000_000&&RARITIES.at(-1).weight===1&&RARITIES.find(r=>r.id==='ultimate')?.supply===8&&RARITIES.find(r=>r.id==='unique')?.supply===1;}
