export const CITY3B_POIS=Object.freeze([
  {id:'heritage-plaza',name:'Place de l’Héritage',kind:'social',detail:'Point de rencontre central et cérémonies des huit valeurs.'},
  {id:'3b-store',name:'Boutique 3B',kind:'commerce',detail:'Collections, équipements et objets exposés dans la ville.'},
  {id:'matrix-mall',name:'Galerie Matrix',kind:'commerce',detail:'Centre commercial numérique noir, or champagne et bleu Matrix.'},
  {id:'community-house',name:'Maison de la Communauté',kind:'social',detail:'Rencontres, événements, groupes et activités communautaires.'},
  {id:'underground-garage',name:'Garage Underground',kind:'mobility',detail:'Hub véhicules, personnalisation et départs vers les activités de conduite.'},
  {id:'creators-tower',name:'Tour des Créateurs',kind:'creative',detail:'Mode 3 IA, textile, musique, exposition et créations des membres.'},
  {id:'passport-terminal',name:'Terminal Passeport 3B',kind:'progression',detail:'Progression, fragments, portes, badges et accès aux quartiers.'},
  {id:'matrix-station',name:'Gare Matrix',kind:'mobility',detail:'Connexion rapide entre les quartiers et les portes internationales.'},
]);

export function city3bVisualStage(snapshot){
  const city=snapshot?.city||null,placements=Array.isArray(snapshot?.placements)?snapshot.placements:[],districts=Array.isArray(snapshot?.districts)?snapshot.districts:[];
  const unlocked=districts.filter(d=>d.unlocked!==false).length;
  const level=Math.max(1,Number(city?.city_level)||1);
  const density=Math.min(1,(placements.length+unlocked*2+level*2)/42);
  const towers=Array.from({length:12},(_,index)=>{
    const seed=(index*17+level*11+placements.length*7+unlocked*13)%29;
    return {id:index,height:24+seed*2+density*38,active:index<Math.max(4,Math.min(12,3+unlocked+Math.floor(level/2)))};
  });
  return {level,density,unlocked,placements:placements.length,towers};
}
