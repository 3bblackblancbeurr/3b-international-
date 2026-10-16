import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChefHat, ChevronRight, Clock3, Heart, Leaf, Search, ShieldCheck, ShoppingBasket, Sparkles, Utensils, X } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { FOODS, RECIPES, SOURCES } from './content.js';
import FOOD_PHOTOS from './foodPhotos.js';
import { displayNumber, localDay, searchText } from './model.js';
import './kitchen3b.css';

const FILTERS = [
  { id:'all', label:'Toutes' }, { id:'quick',label:'20 min' }, { id:'plant',label:'Végétales' },
  { id:'fruit',label:'Avec des fruits' }, { id:'budget',label:'Petit budget' }, { id:'favorites',label:'Mes favoris' }
];
const prepPhoto = recipe => {
  const prominent = recipe.ingredients
    .map(ingredient => FOODS.find(food => FOOD_PHOTOS[food.id] && searchText(ingredient.name).includes(searchText(food.name))))
    .find(Boolean);
  return prominent ? { src:FOOD_PHOTOS[prominent.id].src, name:prominent.name } : null;
};
export const recipeMatches = (recipe, filter) => {
  if (filter === 'quick') return recipe.minutes <= 20;
  if (filter === 'plant') return recipe.tags.some(label => /végétalien|végétarien/i.test(label));
  if (filter === 'budget') return recipe.tags.some(label => /budget|placard|économ/i.test(label));
  if (filter === 'fruit') return recipe.ingredients.some(ingredient => /(poire|pomme|kiwi|fraise|abricot|prune|pêche|orange|banane)/i.test(ingredient.name));
  return true;
};
const nextDates = () => Array.from({length:7},(_,i) => {const d=new Date();d.setDate(d.getDate()+i);return localDay(d)});
const shortDate = date => new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00'));

export default function Kitchen3B({ favorites = [], onOpen, planner, onOpenNutrition }) {
  const [filter,setFilter] = useState('all');
  const [query,setQuery] = useState('');
  const [mode,setMode] = useState('recipes');
  const slider=useRef(null);
  const matches=useMemo(()=>RECIPES.filter(recipe =>
    (filter !== 'favorites' || favorites.includes(recipe.id)) &&
    (filter==='favorites' || recipeMatches(recipe, filter)) &&
    searchText(recipe.name + ' ' + recipe.tags.join(' ') + ' ' + recipe.ingredients.map(i=>i.name).join(' ')).includes(searchText(query))
  ),[filter,query,favorites]);
  const featured=RECIPES.find(recipe=>recipe.id==='couscous-vegetal') || RECIPES[0];
  return <section className="h-kitchen" aria-label="Cuisine 3B, recettes détaillées et menus">
    <div className="h-kitchen-heading"><span className="h-eyebrow">3B INTERNATIONAL · CUISINE SANTÉ</span><h2>Le bon goût.<br/><em>Les bons gestes.</em></h2><p>Des recettes détaillées, accessibles et adaptées à ton quotidien. Aucun régime miracle.</p></div>
    <div className="h-kitchen-hero">
      <img src="/health/photos/hero.webp" alt="Assiette variée, illustration culinaire" width="900" height="610" loading="lazy"/>
      <div><span>LA SÉLECTION 3B</span><strong>{featured.name}</strong><small>{featured.minutes} minutes · {featured.ingredients.length} ingrédients</small>
        <HealthButton variant="health" type="button" onClick={()=>onOpen(featured)}><ChefHat size={17}/> Cuisiner maintenant <ArrowRight size={16}/></HealthButton></div>
    </div>
    <nav className="h-kitchen-switch" aria-label="Cuisine, recettes ou menus">
      <HealthButton variant="health" type="button" aria-current={mode==='recipes'?'page':undefined} onClick={()=>setMode('recipes')}><Utensils size={16}/> Recettes</HealthButton>
      <HealthButton variant="health" type="button" aria-current={mode==='planner'?'page':undefined} onClick={()=>setMode('planner')}><ShoppingBasket size={16}/> Ma semaine & courses</HealthButton>
    </nav>
    {mode==='planner' ? <div className="h-kitchen-planner">{planner}</div> : <>
      <div className="h-kitchen-filters">
        <label className="h-kitchen-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} type="search" aria-label="Chercher une recette ou un ingrédient" placeholder="Quel ingrédient as-tu ?"/>{query&&<HealthButton variant="health" type="button" onClick={()=>setQuery('')} aria-label="Effacer la recherche"><X size={16}/></HealthButton>}</label>
        <div role="group" aria-label="Filtrer les recettes" className="h-kitchen-chips">
          {FILTERS.map(entry=><HealthButton variant="health" type="button" key={entry.id} aria-pressed={filter===entry.id} onClick={()=>setFilter(entry.id)}>{entry.label}</HealthButton>)}
        </div>
      </div>
      <div className="h-kitchen-collection-head"><h3>{matches.length} recettes à découvrir</h3><span>Glisse les photos →</span></div>
      {matches.length ? <div className="h-kitchen-grid" role="list" ref={slider}>
        {matches.map(recipe=>{const photo=prepPhoto(recipe);return <div className="h-kitchen-tile" role="listitem" key={recipe.id}><HealthButton variant="health" type="button" onClick={()=>onOpen(recipe)} aria-label={'Ouvrir les étapes de '+recipe.name}>
          <span className="h-kitchen-tile-media"><img src={photo?.src||'/health/photos/hero.webp'} alt={photo?'Ingrédient vedette : '+photo.name:'Illustration de repas varié'} loading="lazy" width="440" height="370"/><span className="h-kitchen-tile-duration"><Clock3 size={13}/> {recipe.minutes} min</span></span>
          <span className="h-kitchen-tile-name">{recipe.name}<ChevronRight size={17}/></span>
          <small>{recipe.tags.filter(t=>!t.includes('Inspiration')).slice(0,2).join(' · ')}</small>
        </HealthButton></div>})}
      </div> : <div className="h-kitchen-empty"><Search size={27}/><p>Aucune recette avec ces filtres.</p><HealthButton variant="health" type="button" onClick={()=>{setQuery('');setFilter('all')}}>Tout voir <ArrowRight size={15}/></HealthButton></div>}
      <div className="h-kitchen-after"><HealthButton variant="health" type="button" onClick={()=>slider.current?.scrollBy({left:slider.current.clientWidth*.75,behavior:'smooth'})} aria-label="Voir les recettes suivantes">Autres recettes <ArrowRight size={17}/></HealthButton>
      <HealthButton variant="health" type="button" onClick={onOpenNutrition}><Leaf size={16}/> Explorer les nutriments</HealthButton></div>
    </>}
    <p className="h-kitchen-disclaimer"><ShieldCheck size={14}/> Recettes générales pour adultes. Allergies, traitements et besoins particuliers : vérifie chaque ingrédient. Les photos d’ingrédients ne représentent pas le plat terminé.</p>
  </section>;
}

export function KitchenRecipeDetail({ item, health, onClose }) {
  const [servings,setServings]=useState(item.servings);
  const [mode,setMode]=useState('ingredients');
  const [step,setStep]=useState(0);
  const [checked,setChecked]=useState([]);
  const [date,setDate]=useState(localDay());
  const [planned,setPlanned]=useState(false);
  const photo=prepPhoto(item);
  const ratio=servings/item.servings;
  const toggle=(index)=>setChecked(old=>old.includes(index)?old.filter(x=>x!==index):[...old,index]);
  const current=item.steps[step];
  const addToPlan=()=>{
    health.setData(old=>({...old,plan:{...old.plan,[date]:item.id},shoppingChecked:[]}));
    setPlanned(true);
  };
  return <article className="h-kitchen-detail" aria-label={'Recette détaillée '+item.name}>
    <div className="h-kitchen-detail-visual">
      <img src={photo?.src||'/health/photos/hero.webp'} alt={photo?'Ingrédient vedette : '+photo.name:'Illustration culinaire'} width="940" height="570"/>
      <div><span>LA CUISINE 3B · {item.minutes} MIN</span><h2>{item.name}</h2><small>{item.tags.join(' · ')}</small></div>
    </div>
    <div className="h-kitchen-recipe-tabs" role="group" aria-label="Étapes de la recette">
      <HealthButton variant="health" type="button" aria-pressed={mode==='ingredients'} onClick={()=>setMode('ingredients')}><ShoppingBasket size={16}/> Ingrédients</HealthButton>
      <HealthButton variant="health" type="button" aria-pressed={mode==='steps'} onClick={()=>setMode('steps')}><ChefHat size={16}/> Préparation</HealthButton>
      <HealthButton variant="health" type="button" aria-pressed={mode==='plan'} onClick={()=>setMode('plan')}><Clock3 size={16}/> Planifier</HealthButton>
    </div>
    {mode==='ingredients' && <div className="h-kitchen-recipe-ingredients">
      <div className="h-kitchen-serving"><span>Pour combien de personnes ?</span><div><HealthButton variant="health" aria-label="Retirer une personne" disabled={servings===1} onClick={()=>setServings(Math.max(1,servings-1))}>−</HealthButton><strong>{servings}</strong><HealthButton variant="health" aria-label="Ajouter une personne" disabled={servings===8} onClick={()=>setServings(Math.min(8,servings+1))}>+</HealthButton></div></div>
      <p>Appuie sur un ingrédient quand il est prêt. Les quantités s’adaptent automatiquement.</p>
      <div className="h-kitchen-ingredients-list">{item.ingredients.map((one,i)=><HealthButton variant="health" type="button" key={i} aria-pressed={checked.includes(i)} onClick={()=>toggle(i)}><span className="h-kitchen-check">{checked.includes(i)&&<Check size={17}/>}</span><span>{one.name}</span><strong>{typeof one.quantity==='number'?displayNumber(one.quantity*ratio):one.quantity} {one.unit}</strong></HealthButton>)}</div>
      <HealthButton variant="health" className="h-kitchen-primary-action" type="button" onClick={()=>setMode('steps')}>Passer à la préparation <ArrowRight size={19}/></HealthButton>
    </div>}
    {mode==='steps' && <div className="h-kitchen-recipe-steps">
      <div className="h-kitchen-step-count"><span>ÉTAPE {step+1} / {item.steps.length}</span><progress aria-label="Progression de la recette" value={step+1} max={item.steps.length}/></div>
      <h3>{step===0?'On commence.':step===item.steps.length-1?'Dernière étape.':'On continue.'}</h3>
      <p aria-live="polite">{current}</p>
      <div className="h-kitchen-step-controls"><HealthButton variant="health" type="button" disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> Précédent</HealthButton><HealthButton variant="health" type="button" className="h-kitchen-primary-action" onClick={()=>{if(step===item.steps.length-1)setMode('plan');else setStep(s=>s+1)}}>{step===item.steps.length-1?'Terminer':'Étape suivante'} <ArrowRight size={17}/></HealthButton></div>
      <details className="h-kitchen-step-all"><summary>Voir toutes les étapes</summary><ol>{item.steps.map((s,i)=><li key={i}>{s}</li>)}</ol></details>
    </div>}
    {mode==='plan' && <div className="h-kitchen-recipe-plan">
      <h3>On la cuisine quand ?</h3><p>Choisis un jour pour retrouver la recette dans ta semaine et préparer ta liste de courses.</p>
      <label>Ajouter le plat au menu<select aria-label="Jour du repas" value={date} onChange={event=>{setDate(event.target.value);setPlanned(false)}}>{nextDates().map(day=><option key={day} value={day}>{shortDate(day)}</option>)}</select></label>
      <HealthButton variant="health" type="button" className="h-kitchen-primary-action" onClick={addToPlan}><Check size={16}/>{planned?'Repas ajouté à ta semaine':'Ajouter à ma semaine'}</HealthButton>
      {planned&&<p role="status">Le menu du {shortDate(date)} a été mis à jour dans ton journal Santé local.</p>}
    </div>}
    <div className="h-kitchen-recipe-foot">
      <h3>Pourquoi ce repas a sa place</h3>
      {Array.isArray(item.benefits)?item.benefits.map((b,i)=><p key={i}><Leaf size={15}/>{b}</p>):<p>{item.benefits}</p>}
      <div><strong>Allergènes déclarés</strong><p>{item.allergens.length?item.allergens.join(' · '):'Aucun allergène majeur identifié dans les ingrédients prévus.'} Vérifie les étiquettes et les traces possibles.</p></div>
      <details><summary><BookOpen size={16}/> Sources culinaires & repères</summary>{item.sourceIds.filter(id=>SOURCES[id]).map(id=><a key={id} href={SOURCES[id].url} target="_blank" rel="noopener noreferrer">{SOURCES[id].label} ↗</a>)}</details>
    </div>
  </article>;
}
