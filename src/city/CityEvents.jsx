import {CalendarDays} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import './city3b-events.css';

export default function CityEvents({onClose}){
 return <section className="city-events" aria-labelledby="city-events-title">
  <CalendarDays size={32} aria-hidden="true"/>
  <p className="city3b-kicker">LA VIE DE TES VILLES</p>
  <h2 id="city-events-title">ÉVÉNEMENTS</h2>
  <p>Un espace pour créer, organiser et retrouver les rendez-vous de tes villes.</p>
  <div className="city-events-empty" role="status"><strong>Aucun événement disponible</strong><p>La création et la gestion des événements sont en préparation.</p></div>
  <p>Calendriers, saisons, rencontres communautaires, compétitions, festivals, opérations spéciales et événements 3B trouveront leur place ici.</p>
  {onClose&&<Button variant="ghost" onClick={onClose}>Retour à l’accueil</Button>}
 </section>;
}
