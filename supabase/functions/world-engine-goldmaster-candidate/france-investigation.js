import {realmCampaignPosition} from './realm-layout.js';
import {normalizeCampaignState} from './campaign-state.js';

// The case takes place in one walkable Paris settlement. These positions are
// authored against the same town anchor as the roads, homes and relay; the
// evidence is never moved to a different province merely because a phase ends.
const paris=realmCampaignPosition('france',0);
const station=(id,offset,speaker,place,kind)=>Object.freeze({id,position:Object.freeze({x:paris.x+offset[0],z:paris.z+offset[1]}),speaker,place,kind});
export const FRANCE_INVESTIGATION_STATIONS=Object.freeze([
 station('bindery',[4,6],'Léa · relieuse','Établi de la relieuse','witness'),
 station('quay',[32,26],'Le témoin du quai','Promenade des voyageurs','witness'),
 station('forum',[18,44],'Le greffier et les habitants','Cour de la médiation','mediation'),
 station('archive',[6,-25],'Les archives originales','Galerie des registres','archive'),
 station('atelier',[30,-25],'Léa · relieuse','Atelier de la couture','atelier'),
 station('comparison',[18,-10],'Kaïs · examen des traces','Table de rapprochement','comparison'),
 station('plateau',[9,66],'Ton compagnon','Passage des deux plateaux','plateau'),
]);
const stations=Object.fromEntries(FRANCE_INVESTIGATION_STATIONS.map(row=>[row.id,row]));
const objective=(stationId,actionLabel,clue,evidenceId=null)=>Object.freeze({stationId,actionLabel,clue,evidenceId});
const objectives=Object.freeze({
 'rumor:relieuse':objective('bindery','Écouter Léa et relever son témoignage','Léa reconnaît la page manquante : sa couture est faite de trois points bleus.','temoignage_lea'),
 'rumor:temoin':objective('quay','Interroger le témoin du quai','Le témoin a transporté la page avant la correction du registre. Son récit doit être vérifié.','temoignage_quai'),
 'rumor:confronter':objective('forum','Comparer les deux témoignages','Deux récits ne désignent aucun coupable. Le registre original permettra de vérifier la date.'),
 'evidence:archive':objective('archive','Examiner le sceau et relever la date','Sous la surcharge d’encre, le sceau porte encore la date de la première inscription.','date_originale'),
 'evidence:atelier':objective('atelier','Examiner les trois points de couture','Les trois points bleus correspondent au fil et aux trous du livre de Léa.','couture'),
 'evidence:preuve':objective('comparison','Rapprocher la date et la couture','La date précède la correction ; la couture rattache la page au registre. Conserve les deux traces.'),
 'coordination:relais':objective('plateau','Confier le premier plateau au compagnon','Le compagnon visible doit rester en garde. Kaïs tient le second plateau, à dix-huit pas, pendant tout le lien.'),
 'coordination:reparer':objective('bindery','Rendre la page à Léa','Le passage est ouvert et les preuves sont conservées. La page appartient à celle qui l’a reliée.'),
 'post:nouveau':objective('archive','Examiner le dossier corrigé','Une correction récente rétablit le nom, mais sa date ne correspond pas au registre original.','correction'),
 'post:contradictoire':objective('quay','Écouter l’aveu du témoin retrouvé','Le témoin confirme l’innocence de la personne accusée et reconnaît l’erreur du greffier.','aveu'),
 'post:mediation':objective('forum','Consigner les faits devant les habitants','Rétablir le nom protège l’innocent. Conserver l’aveu permet de reconnaître et réparer le tort.'),
});

/** Presentation metadata is read-only. Only the campaign runtime can accept
 * an action, grant a trace or record a consequence. */
export function franceInvestigationObjective(phaseId,stepId){
 const row=objectives[phaseId+':'+stepId];if(!row)return null;
 const site=stations[row.stationId];return{...row,speaker:site.speaker,place:site.place,kind:site.kind,position:{...site.position}};
}
export function franceInvestigationPosition(phaseId,stepId){return franceInvestigationObjective(phaseId,stepId)?.position||null;}

const traces=Object.freeze({
 temoignage_lea:{label:'Témoignage de Léa',text:'Une page manque. Léa reconnaît sa reliure à trois points bleus.'},
 temoignage_quai:{label:'Témoignage du quai',text:'La page a été transportée avant sa disparition. Le registre original reste à comparer.'},
 date_originale:{label:'Date du sceau original',text:'L’inscription originale précède la surcharge d’encre récente.'},
 couture:{label:'Couture à trois points bleus',text:'Le fil et les perforations rattachent la page au livre de Léa.'},
 correction:{label:'Correction du dossier revenu',text:'La nouvelle correction rétablit le nom, mais masque une erreur ancienne.'},
 aveu:{label:'Aveu conservé',text:'Le témoin confirme l’innocence et reconnaît l’erreur du greffier.'},
});

/** No phase number, hover, target, elapsed time or submitted action can make
 * the neighbourhood look repaired. The accepted inventory/effects ledger is
 * the single source for both the evidence notebook and persistent scenery. */
export function franceInvestigationState(save={}){
 const state=normalizeCampaignState('france',save.adventure?.campaigns?.france),accepted=id=>(state.inventory[id]||0)>0;
 const entries=ids=>ids.filter(accepted).map(id=>({id,...traces[id]}));
 return{
  testimonies:entries(['temoignage_lea','temoignage_quai']),
  evidence:entries(['date_originale','couture','correction','aveu']),
  archivesOpen:state.effects.includes('archives_ouvertes'),
  namesRestored:state.effects.includes('noms_retablis'),
  caseResolved:state.effects.includes('dossier_resolu'),
 };
}
