export const THREEB_ECONOMY={
 xp:{id:'xp',name:'XP 3B',transferable:false,purchasable:false,description:'Progression gagnée en jouant, explorant, construisant et accomplissant des missions.'},
 coins:{id:'coins',name:'3B Coins',transferable:false,cashOut:false,description:'Monnaie virtuelle interne de gameplay. Aucun retrait en euros et aucune promesse de valeur monétaire.'},
 token:{id:'token',name:'3B Token',enabled:false,blockchain:false,tradable:false,purchasable:false,cashOut:false,description:'Réservé. Aucun crypto-actif ni échange réel n’est activé.'}
};
export const STARTER_WALLET=Object.freeze({xp:0,coins:500,token:0});
export const FIRST_BUILD_BONUS=Object.freeze({xp:60,coins:25,token:0});
export const XP_REWARDS={discoverZone:20,discoverSecret:80,activateRelay:150,enterCountry:120,mainMission:450,sideMission:140,guardianMission:900,placeFirstBuilding:FIRST_BUILD_BONUS.xp,cityUpgrade:90,cityEvent:120,dailyReturn:25};
export const COIN_REWARDS={discoverSecret:15,mainMission:80,sideMission:25,guardianMission:180,cityEvent:35,placeFirstBuilding:FIRST_BUILD_BONUS.coins};
export const COIN_SINKS={basicDecoration:10,commonBuilding:40,rareBuilding:120,epicBuilding:300,vehicleCosmetic:450,cityTheme:700};
export function levelFromXp(xp=0){return Math.min(150,Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/110))+1));}
export function awardWallet(wallet={},event){const xp=Math.max(0,Math.floor(wallet.xp||0))+Math.max(0,XP_REWARDS[event]||0),coins=Math.max(0,Math.floor(wallet.coins||0))+Math.max(0,COIN_REWARDS[event]||0);return{xp,coins,level:levelFromXp(xp),token:0};}
export function spendCoins(wallet={},amount=0){const cost=Math.max(0,Math.floor(amount));const coins=Math.max(0,Math.floor(wallet.coins||0));return cost>coins?{ok:false,wallet}:{ok:true,wallet:{...wallet,coins:coins-cost}};}
