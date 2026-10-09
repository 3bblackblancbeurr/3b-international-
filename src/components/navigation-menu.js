export const PRINCIPAL_DESTINATIONS=Object.freeze([
 {id:'home',label:'Accueil'},
 {id:'passport',label:'Passeport'},
 {id:'world3b',label:'Monde 3B'},
 {id:'shop',label:'Boutique'},
]);

// Keep this export compatible with the home directory while covering live routes.
export const NAV_GROUPS=Object.freeze([
 {title:'Identité & progression',ids:['passport','member','loyalty']},
 {title:'Univers 3B',ids:['world3b','invisible','secret']},
 {title:'Services & avantages',ids:['shop','control']},
 {title:'En préparation',ids:['nosbloc','games','manga','religion','sport','community','ia']},
 {title:'Comprendre 3B',ids:['guide']},
]);

export const MENU_CATEGORIES=Object.freeze([
 {id:'principal',label:'Principal',ids:['home','passport','world3b','shop']},
 {id:'world',label:'Monde et jeux',ids:['world3b','invisible','secret','games','nosbloc','arena']},
 {id:'account',label:'Compte',ids:['member','passport','loyalty','control']},
 {id:'discover',label:'Découvrir',ids:['guide','community','manga','religion','sport','ia']},
 {id:'settings',label:'Réglages',ids:[]},
]);

const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const assignedIds=new Set(MENU_CATEGORIES.flatMap(category=>category.ids));

export function navigationItems(menuItems=[]){
 const items=new Map([['home',{id:'home',label:'Accueil',description:'Retrouver les espaces principaux.'}]]);
 for(const item of menuItems){if(item?.id&&!items.has(item.id))items.set(item.id,item);}
 return [...items.values()];
}

export function itemsForCategory(menuItems,categoryId){
 const items=navigationItems(menuItems),category=MENU_CATEGORIES.find(item=>item.id===categoryId);
 if(!category)return [];
 const ordered=category.ids.map(id=>items.find(item=>item.id===id)).filter(Boolean);
 return categoryId==='discover'?[...ordered,...items.filter(item=>!assignedIds.has(item.id))]:ordered;
}

export function searchNavigation(menuItems,query){
 const words=normalized(query).trim().split(/\s+/).filter(Boolean);
 return navigationItems(menuItems).filter(item=>{
  const text=normalized(`${item.id} ${item.label} ${item.description||''}`);
  return words.every(word=>text.includes(word));
 });
}

export function categoryForPage(page,menuItems){
 const active=page.startsWith('ia-')?'ia':page;
 return MENU_CATEGORIES.find(category=>itemsForCategory(menuItems,category.id).some(item=>item.id===active))?.id||'principal';
}

export function availableCategories(menuItems){
 return MENU_CATEGORIES.filter(category=>category.id==='settings'||itemsForCategory(menuItems,category.id).length>0);
}
