export const ECONOMY_XP_MAX=10000;
export const ECONOMY_LEVEL_SIZE=1000;
export const ECONOMY_LEVELS=10;

export const ECONOMY_ASSETS=Object.freeze({XP:'xp',COINS:'coins'});
export const ECONOMY_SOURCES=Object.freeze(['daily','quest','combat','guardian','country_discovery','key','achievement','event','shop_refund']);

export const ECONOMY_REWARDS=Object.freeze({
 WELCOME_3B:{label:'Bienvenue dans le Monde du 3B',xp:100,coins:100,repeatable:false},
 DISCOVER_COUNTRY:{label:'Découverte d’un pays',xp:150,coins:75,repeatable:true},
 GUARDIAN_VICTORY:{label:'Victoire contre un gardien',xp:400,coins:250,repeatable:true},
 KEY_FOUND:{label:'Clé 3B récupérée',xp:300,coins:200,repeatable:true},
 QUEST_COMPLETE:{label:'Quête terminée',xp:200,coins:125,repeatable:true},
 DAILY_WORLD:{label:'Présence quotidienne Monde du 3B',xp:50,coins:40,repeatable:true},
});

export const ECONOMY_ITEMS=Object.freeze({
 AURA_MATRIX_BLUE:{name:'Aura Matrix bleue',category:'cosmetic',coinPrice:500,rarity:'rare'},
 TRAIL_CHAMPAGNE_GOLD:{name:'Traînée or champagne',category:'cosmetic',coinPrice:750,rarity:'epic'},
 WOLF_SIGIL_3B:{name:'Sceau du loup 3B',category:'badge',coinPrice:1000,rarity:'legendary'},
});

export function normalizeXp(value){return Math.min(ECONOMY_XP_MAX,Math.max(0,Math.trunc(Number(value)||0)));}
export function normalizeCoins(value){return Math.max(0,Math.trunc(Number(value)||0));}
export function economyLevel(xp){const safe=normalizeXp(xp);return safe>=ECONOMY_XP_MAX?ECONOMY_LEVELS:Math.floor(safe/ECONOMY_LEVEL_SIZE)+1;}
export function nextLevelXp(xp){const safe=normalizeXp(xp);if(safe>=ECONOMY_XP_MAX)return ECONOMY_XP_MAX;return Math.min(ECONOMY_XP_MAX,Math.ceil((safe+1)/ECONOMY_LEVEL_SIZE)*ECONOMY_LEVEL_SIZE);}
export function xpProgress(xp){const safe=normalizeXp(xp);if(safe>=ECONOMY_XP_MAX)return 100;const start=Math.floor(safe/ECONOMY_LEVEL_SIZE)*ECONOMY_LEVEL_SIZE;return Math.round(((safe-start)/ECONOMY_LEVEL_SIZE)*10000)/100;}
export function purchaseTotal(unitPrice,quantity=1){const price=Math.trunc(Number(unitPrice));const qty=Math.trunc(Number(quantity));if(!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(qty)||qty<1||qty>99)throw Error('Achat 3B invalide.');const total=price*qty;if(!Number.isSafeInteger(total))throw Error('Montant 3B invalide.');return total;}
export function canAfford(coins,unitPrice,quantity=1){return normalizeCoins(coins)>=purchaseTotal(unitPrice,quantity);}
export function rewardEventKey(source,subject,eventId){if(!ECONOMY_SOURCES.includes(source))throw Error('Source de récompense inconnue.');const clean=v=>String(v||'').trim().replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,80);const a=clean(subject),b=clean(eventId);if(!a||!b)throw Error('Identifiant de récompense incomplet.');return `${source}:${a}:${b}`;}
export function migrateLegacyEconomy(profile){return{xp:normalizeXp(profile?.xp),coins:normalizeCoins(profile?.points)};}
