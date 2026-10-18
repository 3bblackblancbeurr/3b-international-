import React, { useState } from 'react';
import { Activity, BookOpen, Brain, Eye, Heart, HeartPulse, Leaf, ShieldCheck, Sparkles, Wind } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { FOODS } from './content.js';
import FOOD_PHOTOS from './foodPhotos.js';
import { FOOD_NUTRITION, ORGAN_TOPICS, getFoodTopics } from './nutrition-data.js';
import './body-explorer.css';

const NODES = [
  { id:'eyes', label:'Yeux',x:50,y:10, icon:Eye, group:'organs' },
  { id:'brain', label:'Cerveau',x:50,y:5, icon:Brain, group:'organs' },
  { id:'lungs', label:'Poumons',x:43,y:24, icon:Wind, group:'organs' },
  { id:'skin', label:'Peau',x:28,y:32, icon:Sparkles, group:'organs' },
  { id:'heart', label:'Cœur',x:56,y:25, icon:Heart, group:'organs' },
  { id:'circulation', label:'Circulation',x:73,y:43, icon:HeartPulse, group:'circulation' },
  { id:'liver', label:'Foie',x:46,y:31, icon:Activity, group:'organs' },
  { id:'kidneys', label:'Reins',x:57,y:35, icon:Activity, group:'organs' },
  { id:'digestion', label:'Digestion',x:50,y:40, icon:Leaf, group:'organs' },
  { id:'defenses', label:'Défenses',x:36,y:23, icon:ShieldCheck, group:'circulation' },
  { id:'bones', label:'Os',x:42,y:69, icon:Activity, group:'skeleton' },
];
const PIN_LOCATIONS={brain:[18,5],eyes:[82,13],lungs:[18,23],heart:[82,28],liver:[18,34],kidneys:[82,39],digestion:[18,46],defenses:[18,57],skin:[82,54],circulation:[82,66],bones:[18,74]};

const EXPLANATIONS = {
  brain: 'Le cerveau reçoit et traite les informations sensorielles. Il coordonne notamment les mouvements, la mémoire et de nombreuses fonctions de l’organisme.',
  lungs: 'Les poumons permettent les échanges gazeux : l’oxygène passe vers le sang et le dioxyde de carbone est expiré. Le diaphragme participe à la respiration.',
  kidneys: 'Les deux reins filtrent le sang et participent à l’équilibre de l’eau et des sels minéraux. Ils produisent l’urine et remplissent aussi des fonctions hormonales.',
  eyes: 'Le bêta-carotène peut devenir de la vitamine A, indispensable à la vision normale. La lutéine et la zéaxanthine font partie des pigments de la rétine.',
  skin: 'La vitamine C intervient dans la synthèse du collagène ; la vitamine A participe au maintien normal de la peau. Aucun aliment ne remplace une protection solaire.',
  heart: 'Les fibres et le potassium s’inscrivent dans une alimentation variée favorable à la santé cardiovasculaire. Un aliment ne traite pas une maladie.',
  circulation: 'Le potassium contribue à réguler la pression artérielle dans le cadre d’une alimentation adaptée. Aucun fruit ne « nettoie » les artères.',
  liver: 'Le foie assure déjà les fonctions de transformation et d’élimination de l’organisme. Aucun aliment ni jus ne le « détoxifie » : privilégie la variété et limite l’alcool.',
  digestion: 'Fibres, eau et repas variés favorisent le transit. Augmente progressivement les fibres, en respectant ta tolérance.',
  defenses: 'La vitamine C contribue au fonctionnement normal du système immunitaire. Aucun aliment ne garantit une protection contre les infections.',
  bones: 'Calcium, vitamine K, vitamine D et autres nutriments participent à la santé des os. Les apports viennent d’un ensemble d’aliments et d’habitudes.'
};

const CAROUSEL_ORDER = ['carotte','kiwi','brocoli','epinard','fraise','betterave','pomme','tomate','poire','courge'];
export function foodsForBodyTopic(id, foods=FOODS) {
  if(id==='liver') return [];
  return foods.filter(item => Boolean(FOOD_NUTRITION[item.id]) && getFoodTopics(item.id).includes(id))
    .sort((a,b) => CAROUSEL_ORDER.indexOf(a.id) - CAROUSEL_ORDER.indexOf(b.id));
}
export default function BodyExplorer({ onOpenFood }) {
  const [selected, setSelected] = useState('heart');
  const [layer,setLayer]=useState('all');
  const topic=ORGAN_TOPICS.find(item=>item.id===selected)||NODES.find(item=>item.id===selected);
  const suggested=foodsForBodyTopic(selected).slice(0,7);
  const SelectedIcon=NODES.find(n=>n.id===selected)?.icon||Leaf;
  return <section className="h-human" aria-label="Corps humain interactif et alimentation">
    <header className="h-human-head">
      <span className="h-eyebrow">3B SANTÉ · COMPRENDRE SON CORPS</span>
      <h2>À l’intérieur<br/><em>du vivant.</em></h2>
      <p>Explore les organes, le squelette et la circulation. Relie ce que tu découvres aux repères nutritionnels et, si ton appareil le permet, à ton capteur cardiaque.</p>
    </header>
    <div className="h-human-layers" role="group" aria-label="Repères à afficher">{[['all','Tous les repères'],['organs','Organes'],['skeleton','Squelette'],['circulation','Circulation']].map(([id,label])=><HealthButton key={id} variant="health" aria-pressed={layer===id} onClick={()=>setLayer(id)}>{label}</HealthButton>)}</div>
    <div className="h-human-stage">
      <div className="h-human-scene">
        <div className="h-human-glow" aria-hidden="true"/>
        <img className="h-human-figure" src="/health/anatomy/human-glass-v3.webp" alt="Illustration de synthèse : corps transparent, squelette, cerveau, cœur, poumons, foie et réseau vasculaire" width="840" height="1260" decoding="async"/>
        <svg className="h-human-connectors" viewBox="0 0 100 150" aria-hidden="true">{NODES.filter(node=>layer==='all'||node.group===layer).map(node=><line key={node.id} x1={node.x} y1={node.y*1.5} x2={PIN_LOCATIONS[node.id][0]} y2={PIN_LOCATIONS[node.id][1]*1.5} className={selected===node.id?'is-selected':''}/>)}</svg>
        {NODES.filter(node=>layer==='all'||node.group===layer).map(node=>{
          const Icon=node.icon;
          return <HealthButton variant="health" key={node.id} type="button"
            className={'h-human-hotspot'+(selected===node.id?' is-selected':'')}
            aria-label={'Découvrir : '+node.label} aria-pressed={selected===node.id}
            style={{left:PIN_LOCATIONS[node.id][0]+'%',top:PIN_LOCATIONS[node.id][1]+'%'}}
            onClick={()=>setSelected(node.id)}
          ><Icon size={16}/><span className="h-human-hotspot-label">{node.label}</span></HealthButton>;
        })}
        <span className="h-human-scene-label">ATLAS DU VIVANT · ILLUSTRATION IA</span>
      </div>
      <div className="h-human-info" aria-live="polite">
        <SelectedIcon size={29} aria-hidden="true"/>
        <span className="h-eyebrow">EXPLORER · COMPRENDRE · PRENDRE SOIN</span>
        <h3>{topic?.label}</h3>
        <p>{EXPLANATIONS[selected]}</p>
        {suggested.length ? <>
          <strong className="h-human-info-caption">Aliments à découvrir</strong>
          <div className="h-human-food-track">
            {suggested.map(item=><HealthButton variant="health" key={item.id} type="button" onClick={()=>onOpenFood(item)} aria-label={'Découvrir les nutriments de '+item.name}>
              <img src={FOOD_PHOTOS[item.id]?.src||'/health/photos/vegetables.webp'} alt="" loading="lazy" width="84" height="84"/>
              <span>{item.name}</span>
            </HealthButton>)}
          </div>
        </>:selected==='liver'?<p className="h-human-no-detox">Pas de classement d'aliments « détox » : il n'existe pas de légume qui nettoie le foie à lui seul.</p>:<p className="h-human-no-detox">Un repère pour comprendre l’anatomie. Aucun aliment spécifique n’est recommandé ici.</p>}
        <nav className="h-human-index" aria-label="Explorer toutes les zones du corps">{NODES.map(node=><HealthButton key={node.id} variant="health" aria-pressed={selected===node.id} onClick={()=>{setSelected(node.id);setLayer('all');}}>{node.label}</HealthButton>)}</nav>
        <p className="h-human-caution"><ShieldCheck size={14}/> Illustration pédagogique générée par IA, avec des repères approximatifs ; ce n’est pas un examen de ton corps. Les aliments ne remplacent ni diagnostic ni traitement.</p>
      </div>
    </div>
    <p className="h-human-sources"><BookOpen size={14}/> <a href="https://medlineplus.gov/anatomy.html" target="_blank" rel="noopener noreferrer">Anatomie · MedlinePlus ↗</a> <a href="https://ods.od.nih.gov/factsheets/VitaminA-Consumer/" target="_blank" rel="noopener noreferrer">Vitamine A · NIH ↗</a> <a href="https://ods.od.nih.gov/factsheets/VitaminC-Consumer/" target="_blank" rel="noopener noreferrer">Vitamine C · NIH ↗</a> <a href="https://www.mangerbouger.fr/" target="_blank" rel="noopener noreferrer">Santé publique France ↗</a></p>
  </section>;
}
