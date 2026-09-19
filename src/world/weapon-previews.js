const commonsImage=(file,width=820)=>`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=${width}`;
const commonsPage=file=>`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file).replace(/%20/g,'_')}`;

const SOURCES={
  sabre:{file:'Sabre of Henryk Dembinski detail.jpg',credit:'Wikimedia Commons · CC0',position:'50% 48%'},
  spear:{file:'Spear from Mandaya, Mindanao, Philippines, Honolulu Museum of Art.JPG',credit:'Hiart · Wikimedia Commons · CC0',position:'50% 45%'},
  bow:{file:'Recurve bow.jpg',credit:'Johnwxh30 · Wikimedia Commons · CC0',position:'50% 52%'},
  knives:{file:'Throwing knives.jpg',credit:'www.knifethrowing.info · CC BY-SA 3.0',position:'50% 50%'},
  gauntlet:{file:'Gauntlet for the Right Hand, Belonging to the Armor of Don Alonzo Pérez de Guzman el Bueno (1550–1619), Count of Niebla and Duke of Medina-Sidonia MET DP104361.jpg',credit:'The Metropolitan Museum of Art · CC0',position:'50% 52%'},
  shield:{file:'Shield-1.jpg',credit:'Lokesha kunchadka · Wikimedia Commons · CC BY-SA 4.0',position:'50% 50%'},
  fan:{file:'Tessen fan.JPG',credit:'Samuraiantiqueworld · Wikimedia Commons · CC BY-SA 3.0',position:'50% 50%'},
  scissors:{file:'Scissors MET DP155271.jpg',credit:'The Metropolitan Museum of Art · CC0',position:'50% 50%'},
  axe:{file:'Battle-axe, China, Han dynasty, 206 BC - 220 AD, iron, bronze, gold inlay - Royal Ontario Museum - DSC04027.JPG',credit:'Wikimedia Commons · CC0',position:'50% 50%'},
  claws:{file:'Bagh-Nagh.jpg',credit:'Lothar · Wikimedia Commons · CC BY-SA 3.0',position:'50% 48%'},
  chain:{file:'Chain whip demo.jpg',credit:'U.S. Air Force · domaine public',position:'50% 44%'}
};

const source=key=>{
  const item=SOURCES[key]||SOURCES.sabre;
  return {...item,src:commonsImage(item.file),page:commonsPage(item.file)};
};

const MAP={
  heritage:'sabre',
  paris:'spear',
  romano:'bow',
  tallinn:'sabre',
  bosphore:'knives',
  alger:'gauntlet',
  carthage:'spear',
  zellige:'shield',
  abanico:'fan',
  scissors:'scissors',
  axe:'axe',
  saber:'sabre',
  bow:'bow',
  claws:'claws',
  wings:'knives',
  thread:'chain'
};

export const weaponPreview=id=>source(MAP[id]);
export const WEAPON_PHOTO_CREDITS=Object.entries(SOURCES).map(([id,item])=>({id,...source(id)}));
