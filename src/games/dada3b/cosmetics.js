const KEY='3b_dada_cosmetics_v1';

export const COSMETICS={
  dice:[
    {id:'matrix',name:'Dé Matrix',wins:0,detail:'Lueur digitale bleu 3B.'},
    {id:'champagne',name:'Dé Champagne',wins:1,detail:'Reflets or champagne.'},
    {id:'obsidian',name:'Dé Obsidienne',wins:4,detail:'Noir profond et arêtes froides.'},
  ],
  totem:[
    {id:'guardian',name:'Gardien',wins:0,detail:'Silhouette officielle du Cercle.'},
    {id:'holo',name:'Hologramme',wins:3,detail:'Corps spectral Matrix.'},
    {id:'heritage',name:'Héritage',wins:8,detail:'Or ancien et cœur national.'},
  ],
  trail:[
    {id:'matrix',name:'Trace Matrix',wins:0,detail:'Sillage digital discret.'},
    {id:'gold',name:'Trace Or',wins:5,detail:'Particules champagne.'},
    {id:'nation',name:'Trace Nation',wins:8,detail:'Aura de la couleur du pays.'},
  ],
};

export function cosmeticWins(record){
  return Number.isFinite(record?.wins)?Math.max(0,Math.floor(record.wins)):0;
}

export function unlockedCosmetic(item,record){
  return cosmeticWins(record)>=item.wins;
}

export function readCosmetics(record){
  const fallback={dice:'matrix',totem:'guardian',trail:'matrix'};
  let parsed=fallback;
  try{
    const raw=JSON.parse(localStorage.getItem(KEY));
    if(raw&&typeof raw==='object')parsed={...fallback,...raw};
  }catch{}
  const next={...fallback};
  for(const type of Object.keys(COSMETICS)){
    const item=COSMETICS[type].find(candidate=>candidate.id===parsed[type]);
    next[type]=item&&unlockedCosmetic(item,record)?item.id:fallback[type];
  }
  return next;
}

export function saveCosmetics(value,record){
  const next=readCosmetics(record);
  for(const type of Object.keys(COSMETICS)){
    const item=COSMETICS[type].find(candidate=>candidate.id===value?.[type]);
    if(item&&unlockedCosmetic(item,record))next[type]=item.id;
  }
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}
