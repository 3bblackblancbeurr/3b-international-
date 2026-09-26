export const RANKED_DIVISIONS = [
  { id:'division-8', label:'Division 8', min:0, next:900 },
  { id:'division-7', label:'Division 7', min:900, next:1000 },
  { id:'division-6', label:'Division 6', min:1000, next:1100 },
  { id:'division-5', label:'Division 5', min:1100, next:1200 },
  { id:'division-4', label:'Division 4', min:1200, next:1325 },
  { id:'division-3', label:'Division 3', min:1325, next:1450 },
  { id:'division-2', label:'Division 2', min:1450, next:1600 },
  { id:'division-1', label:'Division 1', min:1600, next:1800 },
  { id:'crown', label:'Crown', min:1800, next:null },
];

export const APPEARANCE_OPTIONS = Object.freeze({
  skinTones: [
    ['tone1','Clair 1','#f1c7a5'],['tone2','Clair 2','#dfad86'],['tone3','Doré','#c88d63'],
    ['tone4','Médium','#ad7655'],['tone5','Brun','#8d5d45'],['tone6','Brun foncé','#714735'],
    ['tone7','Foncé','#553528'],['tone8','Très foncé','#39251e'],
  ],
  hairStyles: [
    ['short','Court'],['fade','Dégradé'],['buzz','Très court'],['curls','Boucles'],
    ['afro','Afro'],['braids','Tresses'],['long','Long'],['shaved','Rasé'],
  ],
  hairColors: [
    ['black','Noir','#111315'],['dark-brown','Brun foncé','#2a1b13'],['brown','Brun','#5c3825'],
    ['auburn','Auburn','#7a3426'],['blond','Blond','#caa86a'],['platinum','Blond clair','#ddd0aa'],
  ],
  faceShapes: [['balanced','Équilibré'],['oval','Ovale'],['square','Carré'],['round','Rond'],['angular','Anguleux'],['long','Allongé']],
  facialHair: [['none','Aucune'],['stubble','Barbe courte'],['goatee','Bouc'],['beard','Barbe']],
  builds: [['slim','Fin'],['athletic','Athlétique'],['strong','Puissant']],
  roles: [['attacker','Attaquant'],['keeper','Gardien'],['versatile','Polyvalent']],
  feet: [['right','Droit'],['left','Gauche']],
});

export function rankedDivisionFor(rating=1000,games=0,placementMatches=5){
  const played=Math.max(0,Number(games)||0);
  const placements=Math.max(1,Number(placementMatches)||5);
  if(played<placements){
    return {id:'placement',label:'Placement',min:0,next:null,remaining:placements-played,progress:played/placements};
  }
  const value=Math.max(0,Number(rating)||0);
  const division=[...RANKED_DIVISIONS].reverse().find(item=>value>=item.min)||RANKED_DIVISIONS[0];
  const progress=division.next==null?1:Math.max(0,Math.min(1,(value-division.min)/(division.next-division.min)));
  return {...division,remaining:0,progress};
}

export function formatPassportPublicId(value){
  const raw=String(value||'').replace(/[^a-f0-9]/gi,'').toUpperCase();
  if(raw.length<12)return 'PASSEPORT 3B';
  return '3B-PASS-'+raw.slice(0,4)+'-'+raw.slice(4,8)+'-'+raw.slice(8,12);
}

export function archetypeLevelForXp(xp=0){
  const safe=Math.max(0,Number(xp)||0);
  return Math.max(1,Math.min(50,1+Math.floor(Math.sqrt(safe/35))));
}

export function profileCompletion(profile){
  const appearance=profile?.appearance||{};
  const missing=[];
  if(!profile?.shirtName)missing.push('nom de maillot');
  if(!profile?.styleId)missing.push('archétype');
  if(!profile?.preferredRole)missing.push('rôle');
  if(!profile?.dominantFoot)missing.push('pied fort');
  if(!appearance.skinTone)missing.push('teinte de peau');
  if(!appearance.hairStyle)missing.push('coiffure');
  if(!appearance.faceShape)missing.push('visage');
  return {ready:missing.length===0,missing};
}

export function scoutingLabel(value){
  return {
    selection:'Sélection confirmée',
    preselection:'Convocation',
    accepted:'Convocation acceptée',
    released:'Non retenu dans la liste finale',
    declined:'Convocation déclinée',
    observe:'Observé',
    radar:'Radar national',
    club:'Carrière club',
    'non-classe':'Placement requis',
    review:'Identité à vérifier',
  }[value]||'Radar national';
}
