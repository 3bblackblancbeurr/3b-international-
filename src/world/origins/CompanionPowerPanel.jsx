import React from 'react';
import {companionPower} from './companion-powers.js';
import {getWeapon} from '../arsenal.js';
export default function CompanionPowerPanel({draft}){const p=companionPower(draft.companion),synergy=p.synergy.includes(draft.weapon);return <article className="armory-detail"><h4>{p.name}</h4><p>{p.description}</p><dl><dt>Coût d’énergie</dt><dd>{p.cost-(synergy?5:0)}{synergy?' · synergie active':''}</dd><dt>Recharge partagée</dt><dd>{p.cooldown} secondes</dd><dt>Limite</dt><dd>{p.weakness}</dd></dl><p>Armes accordées : {p.synergy.map(id=>getWeapon(id).name).join(' ou ')}. Réduction de 5 points du coût.</p><small>En combat : touche F ou bouton du compagnon. Reste à moins de 6 mètres, sans obstacle. Hors combat : recherche et sceaux.</small></article>;}
