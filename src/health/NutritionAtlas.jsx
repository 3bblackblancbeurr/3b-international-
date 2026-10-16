import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Droplets, Eye, Heart, HeartPulse, Leaf, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { SOURCES } from './content.js';
import FOOD_PHOTOS from './foodPhotos.js';
import { searchText } from './model.js';
import { FOOD_NUTRITION, NUTRITION_SOURCES, ORGAN_TOPICS, NO_CURE_NOTE, describeFoodForTopic, getFoodTopics, getNutrition, scaleAmount } from './nutrition-data.js';
import './nutrition-atlas.css';

const FAMILIES = [
  { id: 'all', label: 'Tout' },
  { id: 'fruit', label: 'Fruits' },
  { id: 'vegetable', label: 'Légumes' },
  { id: 'pulse', label: 'Légumineuses' },
  { id: 'other', label: 'Autres' }
];
const ICONS = { eyes: Eye, skin: Sparkles, heart: Heart, circulation: HeartPulse, digestion: Leaf, defenses: ShieldCheck, bones: Activity, liver: Activity };
const number = value => value === null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
const amount = (value, grams, unit) => value === null ? '—' : number(scaleAmount(value, grams)) + ' ' + unit;
const photoOf = item => FOOD_PHOTOS[item.id]?.src || '/health/photos/vegetables.webp';
const altOf = item => FOOD_PHOTOS[item.id]?.alt || ('Photographie illustrative de ' + item.name);

function ScrollControls({ scrollRef, label }) {
  return <div className="h-atlas-scroll-controls" role="group" aria-label={label}>
    <HealthButton variant="health" type="button" aria-label="Revenir aux aliments précédents" onClick={() => scrollRef.current?.scrollBy({ left: -Math.max(260, scrollRef.current.clientWidth * .8), behavior: 'smooth' })}><ArrowLeft size={17}/></HealthButton>
    <HealthButton variant="health" type="button" aria-label="Voir les aliments suivants" onClick={() => scrollRef.current?.scrollBy({ left: Math.max(260, scrollRef.current.clientWidth * .8), behavior: 'smooth' })}><ArrowRight size={17}/></HealthButton>
  </div>;
}
export function NutritionAtlas({ foods, favorites = [], onOpen }) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [organ, setOrgan] = useState('all');
  const [seasonOnly, setSeasonOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const track = useRef(null);
  const month = new Date().getMonth() + 1;
  const visible = useMemo(() => foods.filter(item => {
    const matchesFamily = family === 'all' || item.group === family;
    const matchesBody = organ === 'all' || organ === 'liver' || getFoodTopics(item.id).includes(organ);
    const matchesSearch = searchText(item.name + ' ' + item.summary + ' ' + (getNutrition(item.id)?.highlights.join(' ') || '')).includes(searchText(query));
    return matchesFamily && matchesBody && matchesSearch && (!seasonOnly || item.season.includes(month)) && (!favoritesOnly || favorites.includes(item.id));
  }), [foods, query, family, organ, seasonOnly, favoritesOnly, favorites, month]);
  const featured = visible.find(item => item.id === 'carotte') || visible.find(item => Boolean(FOOD_NUTRITION[item.id])) || visible[0];
  const selection = ORGAN_TOPICS.find(item => item.id === organ) || ORGAN_TOPICS[0];
  useEffect(() => { if (track.current) track.current.scrollLeft = 0; }, [query, family, organ, seasonOnly, favoritesOnly]);
  function reset() { setQuery(''); setFamily('all'); setOrgan('all'); setSeasonOnly(false); setFavoritesOnly(false); }

  return <section className="h-atlas" aria-label="Atlas interactif des aliments et de leurs nutriments">
    <div className="h-atlas-intro">
      <div><span className="h-atlas-kicker">3B · LE VIVANT À DÉCOUVRIR</span><h2>La nature, <em>en détail.</em></h2><p>Un aliment. Ses nutriments. Ce qu'ils apportent vraiment.</p></div>
      <span className="h-atlas-count" aria-live="polite">{visible.length} aliments</span>
    </div>
    {featured && <HealthButton variant="health" type="button" className="h-atlas-feature" onClick={() => onOpen(featured)} aria-label={'Explorer les bienfaits et la composition de ' + featured.name}>
      <img src={photoOf(featured)} alt="" loading="lazy" width="1200" height="560"/>
      <span className="h-atlas-feature-text"><small>À DÉCOUVRIR · TOUCHER POUR EXPLORER</small><strong>{featured.name}</strong><span>{getNutrition(featured.id)?.highlights[0] || featured.summary}</span></span>
      <span className="h-atlas-feature-action"><ArrowRight size={22}/></span>
    </HealthButton>}
    <div className="h-atlas-explore-tools">
      <label className="h-atlas-search"><Search size={19}/><input aria-label="Rechercher un fruit ou un légume" type="search" placeholder="Chercher un aliment, une vitamine…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <HealthButton variant="health" type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={16}/></HealthButton>}</label>
      <div className="h-atlas-small-filters" role="group" aria-label="Sélection des aliments">
        <HealthButton variant="health" type="button" aria-pressed={seasonOnly} className={seasonOnly ? 'is-on' : ''} onClick={() => setSeasonOnly(!seasonOnly)}><Leaf size={15}/> De saison</HealthButton>
        <HealthButton variant="health" type="button" aria-pressed={favoritesOnly} className={favoritesOnly ? 'is-on' : ''} onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart size={15}/> Favoris</HealthButton>
      </div>
    </div>
    <div className="h-atlas-family" role="group" aria-label="Famille d'aliments">
      {FAMILIES.map(entry => <HealthButton variant="health" type="button" key={entry.id} aria-pressed={entry.id === family} onClick={() => setFamily(entry.id)}>{entry.label}</HealthButton>)}
    </div>
    <div className="h-atlas-interest"><span>JE VEUX COMPRENDRE…</span><div className="h-atlas-topics" role="group" aria-label="Explorer les rôles des nutriments dans le corps">
      {ORGAN_TOPICS.map(topic => { const Icon = ICONS[topic.id] || Leaf; return <HealthButton variant="health" type="button" aria-pressed={organ === topic.id} key={topic.id} onClick={() => setOrgan(topic.id)}>{organ === topic.id && <Check size={14}/ >}{topic.id !== 'all' && <Icon size={15}/ >}{topic.label}</HealthButton>; })}
    </div></div>
    {organ !== 'all' && <div className="h-atlas-insight" role="status"><span>{selection.label.toUpperCase()}</span><p>{selection.detail}</p>{organ === 'liver' && <small>Aucun classement « meilleur aliment détox » : les fiches ci-dessous restent purement nutritionnelles.</small>}</div>}
    <div className="h-atlas-results-header"><strong>{organ === 'all' ? 'La collection' : 'À explorer'}</strong><span>{visible.length ? 'Fais glisser pour voir la suite →' : 'Aucun aliment correspondant'}</span></div>
    {visible.length ? <div className="h-atlas-grid" ref={track} role="list" aria-label="Aliments à explorer">
      {visible.map(item => <div key={item.id} role="listitem" className="h-atlas-grid-item">
        <HealthButton variant="health" type="button" className="h-atlas-tile" onClick={() => onOpen(item)} aria-label={'Fiche complète : ' + item.name}>
          <span className="h-atlas-photo"><img src={photoOf(item)} alt={altOf(item)} loading="lazy" width="420" height="420"/>{favorites.includes(item.id) && <Heart className="h-atlas-heart" size={18} fill="currentColor"/>}</span>
          <span className="h-atlas-tile-name">{item.name}<ChevronRight size={17}/></span>
          <small>{getNutrition(item.id)?.highlights[0] || 'Découvrir ses bienfaits'}</small>
        </HealthButton>
      </div>)}
    </div> : <div className="h-atlas-empty"><Leaf size={25}/><strong>Aucun aliment avec ces filtres.</strong><HealthButton variant="health" type="button" onClick={reset}>Tout explorer <ArrowRight size={15}/></HealthButton></div>}
    {visible.length > 4 && <ScrollControls scrollRef={track} label="Faire défiler la collection de fruits et légumes"/>}
    <p className="h-atlas-source-line"><ShieldCheck size={15}/> Valeurs indicatives documentées par aliment et préparation, jamais inventées. <a href={NUTRITION_SOURCES.ciqual.url} target="_blank" rel="noopener noreferrer">Anses · Ciqual 2025 ↗</a></p>
  </section>;
}

export function NutritionDetail({ item, isFavorite, onFavorite }) {
  const [section, setSection] = useState('composition');
  const [grams, setGrams] = useState(100);
  const entry = getNutrition(item.id);
  const [body, setBody] = useState(entry?.organs[0] || 'digestion');
  const choices = entry?.organs || [];
  const topic = ORGAN_TOPICS.find(one => one.id === body) || ORGAN_TOPICS[0];
  const BodyIcon = ICONS[body] || Leaf;
  return <article className="h-nutrition" aria-label={'Fiche nutritionnelle de ' + item.name}>
    <div className="h-nutrition-hero"><img src={photoOf(item)} alt={altOf(item)} width="920" height="520" loading="eager"/><div><small>ATLAS 3B · {item.group === 'fruit' ? 'FRUIT' : item.group === 'vegetable' ? 'LÉGUME' : 'ALIMENT'}</small><h2>{item.name}</h2><span>{entry?.preparation || 'Composition chiffrée en cours de vérification'}</span></div></div>
    <div className="h-nutrition-subactions"><p>{item.summary}</p><HealthButton variant="health" type="button" onClick={onFavorite} aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={isFavorite} className="h-nutrition-favorite"><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'}/></HealthButton></div>
    <div className="h-nutrition-tabs" role="group" aria-label="Sections de la fiche">
      {[{ id:'composition', label:'Nutriments' },{ id:'effects', label:'Pour le corps' },{ id:'kitchen', label:'En cuisine' }].map(tab => <HealthButton variant="health" type="button" key={tab.id} aria-pressed={section === tab.id} onClick={() => setSection(tab.id)}>{tab.label}</HealthButton>)}
    </div>
    {section === 'composition' && <div className="h-nutrition-composition">
      {entry ? <>
        <div className="h-nutrition-portion"><div><span>COMPOSITION MOYENNE</span><strong>{entry.preparation}</strong></div><div role="group" aria-label="Quantité théorique"><HealthButton variant="health" type="button" onClick={() => setGrams(100)} aria-pressed={grams === 100}>100 g</HealthButton><HealthButton variant="health" type="button" onClick={() => setGrams(150)} aria-pressed={grams === 150}>150 g</HealthButton></div></div>
        <div className="h-nutrition-energy"><span>ÉNERGIE</span><div><strong>{number(scaleAmount(entry.values.kcal, grams))}</strong><small>kcal</small></div><p>La valeur change avec la quantité choisie.</p></div>
        <div className="h-nutrition-macro" aria-label="Macronutriments">
          {[['Glucides','carbs'],['dont sucres','sugars'],['Protéines','protein'],['Fibres','fiber'],['Matières grasses','fats']].map(([label,key]) => <div key={key}><span>{label}</span><strong>{amount(entry.values[key], grams, 'g')}</strong></div>)}
        </div>
        <div className="h-nutrition-vitamins"><h3>Vitamines & minéraux</h3>{entry.micronutrients.map(n => <div key={n.label}><span>{n.label}</span><strong>{amount(n.value, grams, n.unit)}</strong></div>)}{entry.highlights.map(value => <p key={value}><Sparkles size={14}/>{value}</p>)}</div>
        <p className="h-nutrition-method"><ShieldCheck size={15}/> Valeurs moyennes indicatives pour la partie comestible et l’état précisés, hors ajout d’huile ou de sauce. Les tirets signalent une donnée non renseignée, pas une teneur nulle. Certaines vitamines varient fortement à la cuisson.</p>
      </> : <div className="h-nutrition-no-data"><BookOpen size={27}/><h3>Les chiffres ne sont pas encore suffisamment documentés pour cette préparation.</h3><p>Nous préférons afficher une donnée absente plutôt qu’inventer des calories, des vitamines ou des pourcentages.</p></div>}
    </div>}
    {section === 'effects' && <div className="h-nutrition-effects">
      <h3>Ses rôles dans l'organisme</h3><p>Choisis une partie du corps. Voici le rôle connu des nutriments, sans promesse médicale.</p>
      {choices.length > 0 ? <><div className="h-nutrition-body-choices" role="group" aria-label="Parties du corps concernées">{choices.map(id => {const info=ORGAN_TOPICS.find(t => t.id === id);const Icon=ICONS[id] || Leaf;return <HealthButton variant="health" type="button" aria-pressed={body === id} onClick={() => setBody(id)} key={id}><Icon size={16}/>{info?.label || id}</HealthButton>;})}</div>
      <div className="h-nutrition-body-feature" aria-live="polite"><BodyIcon size={33}/><span>LE CORPS · {topic.label.toUpperCase()}</span><p>{describeFoodForTopic(item.id, body)}</p><small>{topic.detail}</small></div></> : <p>Cette préparation n’est pas encore reliée à une fonction précise faute de données nutritionnelles suffisamment documentées.</p>}
      <details className="h-nutrition-liver"><summary>Et pour le foie ?</summary><p>{ORGAN_TOPICS.find(t => t.id === 'liver').detail}</p></details>
      <p className="h-nutrition-method">{NO_CURE_NOTE}</p>
    </div>}
    {section === 'kitchen' && <div className="h-nutrition-kitchen">
      <h3>Idées simples</h3><ol>{item.uses?.map((entry,index) => <li key={index}>{entry}</li>)}</ol>
      {item.tips?.length > 0 && <details><summary>Préparation & conservation</summary><ul>{item.tips.map((tip,i) => <li key={i}>{tip}</li>)}</ul></details>}
      <div className="h-nutrition-safety"><ShieldCheck size={19}/><div><strong>Précaution utile</strong><p>{item.caution}</p></div></div>
    </div>}
    <div className="h-nutrition-references"><details><summary><BookOpen size={16}/> Sources et méthode <ChevronRight size={15}/></summary><div>
      {entry && <p>Table de composition « Ciqual 2025 », Anses. Identifiant de l’aliment : <strong>{entry.ciqualCode}</strong>. Valeurs reprises à titre indicatif pour la préparation indiquée ; à confirmer sur la base de référence si un calcul thérapeutique est nécessaire.</p>}
      {Object.entries(NUTRITION_SOURCES).map(([id,src]) => <a key={id} href={src.url} target="_blank" rel="noopener noreferrer">{src.name} ↗</a>)}
      {(item.sourceIds || []).filter(id => SOURCES[id]).map(id => <a key={id} href={SOURCES[id].url} target="_blank" rel="noopener noreferrer">{SOURCES[id].label} ↗</a>)}
    </div></details></div>
  </article>;
}
