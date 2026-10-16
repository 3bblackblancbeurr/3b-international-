import React, { useState } from 'react';
import { Activity, ArrowRight, BookOpen, Droplets, Eye, Heart, HeartPulse, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { FOODS } from './content.js';
import FOOD_PHOTOS from './foodPhotos.js';
import { FOOD_NUTRITION, ORGAN_TOPICS, getFoodTopics } from './nutrition-data.js';
import './body-explorer.css';

const NODES = [
  { id:'eyes', label:'Yeux',x:49,y:14, icon:Eye },
  { id:'skin', label:'Peau',x:30,y:30, icon:Sparkles },
  { id:'heart', label:'Cœur',x:56,y:35, icon:Heart },
  { id:'circulation', label:'Circulation',x:67,y:46, icon:HeartPulse },
  { id:'liver', label:'Foie',x:58,y:47, icon:Activity },
  { id:'digestion', label:'Digestion',x:47,y:56, icon:Leaf },
  { id:'defenses', label:'Défenses',x:32,y:43, icon:ShieldCheck },
  { id:'bones', label:'Os',x:39,y:79, icon:Activity },
];

const EXPLANATIONS = {
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
  const [selected, setSelected] = useState('eyes');
  const topic=ORGAN_TOPICS.find(item=>item.id===selected);
  const suggested=foodsForBodyTopic(selected).slice(0,7);
  const SelectedIcon=NODES.find(n=>n.id===selected)?.icon||Leaf;
  return <section className="h-human" aria-label="Corps humain interactif et alimentation">
    <header className="h-human-head">
      <span className="h-eyebrow">3B SANTÉ · COMPRENDRE SON CORPS</span>
      <h2>À l’intérieur<br/><em>du vivant.</em></h2>
      <p>Touche une zone du corps pour découvrir le rôle des nutriments. Aucune promesse de guérison.</p>
    </header>
    <div className="h-human-stage">
      <div className="h-human-scene">
        <div className="h-human-glow" aria-hidden="true"/>
        <svg className="h-human-figure" viewBox="0 0 300 540" role="img" aria-label="Silhouette humaine stylisée, avec des points interactifs disposés sur les yeux, le torse et les jambes">
          <defs>
            <linearGradient id="h-human-material" x1="0%" y1="0%" x2="100%" y2="85%"><stop stopColor="#acd6b4" stopOpacity=".5"/><stop offset=".48" stopColor="#568f79" stopOpacity=".65"/><stop offset="1" stopColor="#214d42" stopOpacity=".32"/></linearGradient>
            <radialGradient id="h-human-organ-glow"><stop stopColor="#d7d9b4" stopOpacity=".85"/><stop offset="1" stopColor="#b8dec3" stopOpacity="0"/></radialGradient>
          </defs>
          <path d="M140 33 C126 37 119 49 117 67 L119 88 C122 106 131 111 130 126 C130 136 125 141 113 145 L86 155 C69 162 61 176 54 203 L26 301 C20 321 30 330 42 329 C55 327 59 315 64 302 L88 228 C94 212 96 220 96 231 L99 287 C101 317 104 329 102 354 L93 477 C91 499 100 510 112 511 C125 511 133 497 135 480 L145 382 C147 364 151 359 154 384 L165 482 C168 499 176 511 187 511 C202 509 205 497 203 479 L198 358 C196 340 197 319 202 287 L205 236 C205 216 208 215 213 229 L239 305 C247 326 259 333 269 325 C278 317 276 304 272 290 L245 199 C238 171 229 161 212 155 L187 146 C174 142 168 138 169 125 C171 114 180 106 183 90 L183 65 C181 46 170 35 157 33 Z"
            fill="url(#h-human-material)" stroke="#bfdfc3" strokeWidth="1.8" strokeOpacity=".7"/>
          <path d="M150 37 L150 504 M119 84 Q150 102 181 84 M96 228 Q150 245 204 228 M103 300 Q151 322 199 301" fill="none" stroke="#dbefcd" strokeOpacity=".2" strokeWidth="1.3"/>
          <path d="M118 179 Q151 191 182 179 Q185 213 179 245 Q153 263 121 245 Q113 212 118 179 Z" fill="#08291fe0" stroke="#c4ddc147" strokeWidth="1"/>
          <path d="M140 186 C127 181 124 198 137 213 L151 228 C160 214 176 197 166 187 C159 178 150 185 147 190 Z" fill="#dbbba180" stroke="#f1dab577" strokeWidth="1.8"/>
          <path d="M150 225 C133 221 130 241 132 262 C132 275 144 287 156 281 C171 272 168 249 162 240" fill="none" stroke="#d0b594" strokeWidth="4" strokeLinecap="round" strokeOpacity=".7"/>
          <ellipse cx="153" cy="240" rx="66" ry="98" fill="url(#h-human-organ-glow)" opacity=".15"/>
          <circle cx="135" cy="75" r="3.5" fill="#f0e8b9"/><circle cx="166" cy="75" r="3.5" fill="#f0e8b9"/>
        </svg>
        {NODES.map(node=>{
          const Icon=node.icon;
          return <HealthButton variant="health" key={node.id} type="button"
            className={'h-human-hotspot'+(selected===node.id?' is-selected':'')}
            aria-label={'Découvrir : '+node.label} aria-pressed={selected===node.id}
            style={{left:node.x+'%',top:node.y+'%'}}
            onClick={()=>setSelected(node.id)}
          ><Icon size={16}/><span className="h-human-hotspot-label">{node.label}</span></HealthButton>;
        })}
        <span className="h-human-scene-label">TOUCHE LES POINTS LUMINEUX</span>
      </div>
      <div className="h-human-info" aria-live="polite">
        <SelectedIcon size={29} aria-hidden="true"/>
        <span className="h-eyebrow">{topic?.label.toUpperCase()} · NUTRITION</span>
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
        </>:<p className="h-human-no-detox">Pas de classement d'aliments « détox » : il n'existe pas de légume qui nettoie le foie à lui seul.</p>}
        <p className="h-human-caution"><ShieldCheck size={14}/> Information générale, non personnalisée. Les nutriments contribuent aux fonctions normales du corps ; les aliments ne remplacent ni diagnostic ni traitement.</p>
      </div>
    </div>
    <p className="h-human-sources"><BookOpen size={14}/> <a href="https://ods.od.nih.gov/factsheets/VitaminA-Consumer/" target="_blank" rel="noopener noreferrer">Vitamine A · NIH ↗</a> <a href="https://ods.od.nih.gov/factsheets/VitaminC-Consumer/" target="_blank" rel="noopener noreferrer">Vitamine C · NIH ↗</a> <a href="https://www.mangerbouger.fr/" target="_blank" rel="noopener noreferrer">Santé publique France ↗</a></p>
  </section>;
}
