export const COUNTRIES=['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne'];
export const TIERS=[
 {id:'discovery',name:'Découverte',xp:0,color:'#80d7e7',motto:'Tout commence ici.',benefit:'Ta carte nominative et le suivi de tes récompenses.'},
 {id:'explorer',name:'Explorateur',xp:300,color:'#78d6ae',motto:'Le monde t’appartient.',benefit:'Le design Émeraude et l’aura Explorateur dans les Ombres et le Labyrinthe.'},
 {id:'heir',name:'Héritier',xp:1500,color:'#ecc884',motto:'Porte ton histoire.',benefit:'Le design Or et l’aura Héritier dans les Ombres et le Labyrinthe.'},
 {id:'ambassador',name:'Ambassadeur',xp:5000,color:'#b6a2f4',motto:'Huit pays. Une même lumière.',benefit:'Le design Améthyste et l’aura Ambassadeur dans les Ombres et le Labyrinthe.'},
 {id:'legend',name:'Légende',xp:12000,color:'#f4db9c',motto:'Laisse ton empreinte.',benefit:'Le design Obsidienne et l’aura Légende dans les Ombres et le Labyrinthe.'},
 {id:'builder',name:'Bâtisseur',xp:30000,color:'#e9aa7e',motto:'Construis le monde de demain.',benefit:'Le design Cuivre et l’aura Bâtisseur dans les Ombres et le Labyrinthe.'},
 {id:'visionary',name:'Visionnaire',xp:60000,color:'#a9dff4',motto:'Vois plus loin, imagine ensemble.',benefit:'Le design Platine et l’aura Visionnaire dans les Ombres et le Labyrinthe.'},
 {id:'eternal',name:'Éternel',xp:100000,color:'#f5dfbc',motto:'La lumière se transmet.',benefit:'Le design Nacre et l’aura Éternel dans les Ombres et le Labyrinthe.'},
];
export const DISCOUNTS=[{points:1000,percent:5},{points:3000,percent:8},{points:7000,percent:10}];
const SHOP_DESIGNS=[{id:'argent',name:'Argent',color:'#dce5ef',story:'Le vestiaire en mouvement'},{id:'or',name:'Or',color:'#e9c384',story:'Le goût des belles matières'},{id:'noire',name:'Noire',color:'#d8c7a3',story:'La signature du Cercle'}];
export const SHOP_TIERS=[{id:'club',name:'Club',points:0,percent:0,color:'#c8d9e7',story:'Bienvenue dans le vestiaire 3B'},...DISCOUNTS.map((benefit,i)=>({...SHOP_DESIGNS[i],...benefit}))];
export const shopTierFor=points=>SHOP_TIERS.filter(t=>t.points<=Math.max(0,Number(points)||0)).at(-1);
export const nextShopTier=points=>SHOP_TIERS.find(t=>t.points>Math.max(0,Number(points)||0))||null;
export const GAMES=['arena','tower','maze','refuge','cities','world'];
export const EXPLORATIONS={passport:'Découvrir le passeport',manga:'Découvrir le manga',world3b:'Explorer les huit pays'};
export const tierFor=xp=>TIERS.filter(t=>t.xp<=Math.max(0,Number(xp)||0)).at(-1);
export const discountFor=points=>DISCOUNTS.filter(t=>t.points<=Math.max(0,Number(points)||0)).at(-1)?.percent||0;
export const nextTier=xp=>TIERS.find(t=>t.xp>xp)||null;
export const themeFor=(id,xp)=>TIERS.find(t=>t.id===id&&t.xp<=xp)||tierFor(xp);
export function validateAccount(input){
 const handle=String(input?.handle||'').trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(handle))throw Error('Choisis un identifiant de 3 à 24 lettres minuscules, chiffres, points ou tirets.');
 if(typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw Error('Choisis un mot de passe de 12 à 128 caractères.');
 const name=String(input.name||handle).trim();if(name.length<2||name.length>80)throw Error('Le nom affiché doit contenir 2 à 80 caractères.');
 const country=input.country||'France';if(!COUNTRIES.includes(country))throw Error('Choisis un pays 3B.');
 return{handle,password:input.password,name,country};
}
export const accountEmail=handle=>'u.'+handle+'@accounts.3b.invalid';
export function purchaseRewards(cents){
 if(!Number.isSafeInteger(cents)||cents<0)throw Error('Montant invalide.');
 return{points:Math.floor(cents/10),xp:Math.floor(cents/10)};
}
