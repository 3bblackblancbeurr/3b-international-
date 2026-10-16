export const PRINCIPAL_DESTINATIONS=Object.freeze([
 {id:'home',label:'Accueil'},
 {id:'invisible',label:'Scanner'},
 {id:'world3b',label:'Monde 3B'},
 {id:'shop',label:'Boutique'},
]);

// Keep this export compatible with the home directory while covering live routes.
export const NAV_GROUPS=Object.freeze([
 {title:'Identité & progression',ids:['passport','member','loyalty']},
 {title:'Univers 3B',ids:['world3b','invisible','secret']},
 {title:'Jeux & compétition',ids:['games','manga','sport','esports']},
 {title:'Services & avantages',ids:['health','deals','shop','control']},
 {title:'Création & communauté',ids:['community','ia']},
 {title:'En préparation',ids:['nosbloc']},
 {title:'Comprendre 3B',ids:['guide','religion']},
]);

export const MENU_CATEGORIES=Object.freeze([
 {id:'principal',label:'Essentiel',ids:['home','invisible','world3b','shop','health','deals']},
 {id:'world',label:'Monde',ids:['world3b','invisible','secret','nosbloc','arena']},
 {id:'play',label:'Jeux & sport',ids:['games','sport','esports']},
 {id:'account',label:'Compte',ids:['member','passport','loyalty','control']},
 {id:'discover',label:'Découvrir',ids:['guide','community','manga','religion','ia']},
 {id:'settings',label:'Réglages',ids:[]},
]);

const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const assignedIds=new Set(MENU_CATEGORIES.flatMap(category=>category.ids));
const scannerDestination=item=>({...item,label:'Scanner',description:'Faire apparaître une scène autour de toi.',target:'scanner'});

export function navigationItems(menuItems=[]){
 const items=new Map([['home',{id:'home',label:'Accueil',description:'Retrouver les espaces principaux.'}]]);
 for(const item of menuItems){if(item?.id&&!items.has(item.id))items.set(item.id,item);}
 return [...items.values()];
}

export function itemsForCategory(menuItems,categoryId){
 const items=navigationItems(menuItems).filter(item=>item.status!=='soon'),category=MENU_CATEGORIES.find(item=>item.id===categoryId);
 if(!category)return [];
 const ordered=category.ids.map(id=>items.find(item=>item.id===id)).filter(Boolean).map(item=>categoryId==='principal'&&item.id==='invisible'?scannerDestination(item):item);
 return categoryId==='discover'?[...ordered,...items.filter(item=>!assignedIds.has(item.id))]:ordered;
}

export function searchNavigation(menuItems,query){
 const words=normalized(query).trim().split(/\s+/).filter(Boolean);
 const cameraIntent=words.some(word=>word.length>=3&&['scanner','camera'].some(alias=>alias.startsWith(word)));
 return navigationItems(menuItems).filter(item=>item.status!=='soon').filter(item=>{
  const text=normalized(`${item.id} ${item.label} ${item.description||''} ${item.id==='invisible'?'scanner caméra réalité augmentée':''}`);
  return words.every(word=>text.includes(word));
 }).map(item=>item.id==='invisible'&&cameraIntent?scannerDestination(item):item);
}

export function categoryForPage(page,menuItems){
 const active=page.startsWith('ia-')?'ia':page;
 if(active==='invisible')return 'world';
 return MENU_CATEGORIES.find(category=>itemsForCategory(menuItems,category.id).some(item=>item.id===active))?.id||'principal';
}

export function availableCategories(menuItems){
 return MENU_CATEGORIES.filter(category=>category.id==='settings'||itemsForCategory(menuItems,category.id).length>0);
}

/** Keep unfinished spaces discoverable without crowding live destinations. */
export function partitionDestinations(items = []) {
 return { available: items.filter(item => item.status !== 'soon'), upcoming: items.filter(item => item.status === 'soon') };
}
