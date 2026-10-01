import missions from './data/missions-v1.json' with {type:'json'};
import {hubMissionLockReason} from './mission-graph.js';

const byId=Object.fromEntries(missions.map(mission=>[mission.id,mission]));
export const HUB_DISTRICT_STORIES=Object.freeze({
 heritage_square:{name:'la Place de l’Héritage',text:'Les chemins de la Cité se croisent ici. La Maison de l’Accueil et le 3B Express te permettent de prendre tes repères avant de rejoindre les Archives.'},
 broken_circle_tower:{name:'la Tour du Cercle Brisé',text:'Les huit héritages ont chacun leur signal. La Tour nous aide à les écouter ensemble sans effacer leurs différences.'},
 archives:{name:'les Archives de la Mémoire',text:'Inès recherche les souvenirs, Céline en restaure les voix. Kadra retrouve aux Docks les traces englouties : leurs recherches se complètent.'},
 arena:{name:'l’Arène 3B',text:'Hugo enseigne les déplacements, Sofia la maîtrise sous pression et Adrián accompagne les défis. Ici, un geste précis vaut mieux qu’un geste spectaculaire qui met les autres en danger.'},
 commerce:{name:'le quartier Commerce',text:'Nora lit les reflets, Omar assemble les motifs et Meryem travaille la fibre. Leurs ateliers transmettent des savoir-faire : regarde comment chaque pièce a été faite.'},
 community:{name:'le quartier Communauté',text:'Amira écoute les désaccords, Soraya recueille les témoignages et Lucía rassemble les habitants. Une même place peut porter plusieurs histoires.'},
 innovation:{name:'le quartier Innovation et IA',text:'Arda veille sur les relais et Leyla sur les téléphériques. Les lumières de la Cité et les déplacements dépendent de leur travail commun.'},
 docks:{name:'les Docks et Transports',text:'Samir connaît les routes, Lyna entretient les navettes et Youssef prépare les secours. Kadra cherche dans les eaux les souvenirs que les Archives n’ont pas pu conserver.'},
 gardens:{name:'les Jardins de l’Unité',text:'Giulia restaure le conservatoire, Maarja écoute les signaux et Evelin protège les animaux. Laisse-leur de l’espace : tout ce qui vit ici ne cherche pas à être approché.'},
 city3b_portal:{name:'le portail de la Ville 3B',text:'Élio prépare les espaces du quartier. Tu peux aussi créer ta propre ville depuis le menu principal, indépendamment de tes missions dans le Monde.'},
});

// Hints describe existing objectives only; they neither execute actions nor grant rewards.
const HINTS={
 first_steps:['Commence par la Maison de l’Accueil sur la Place.','Rejoins une station et prends le 3B Express.','Reviens à la Place de l’Héritage après ton trajet.'],
 first_echo:['Aux Archives, cherche le signal et utilise le scanner.','Restaure le Souvenir retrouvé avec la vision de mémoire.','Active la balise pour ancrer ce Souvenir.'],
 eight_signals:['Synchronise chacune des huit fréquences à la Tour.','Scanne la Porte instable après la synchronisation.'],
 rooftops_circle:['Suis le parcours des toits jusqu’au bout.','Utilise les deux tyroliennes du parcours.','Rejoins le belvédère et observe la Cité.'],
 boat_without_flag:['Observe les départs aux Docks la nuit, puis suis le bateau sans pavillon.','Inspecte le quai abandonné indiqué par la piste.'],
 storm_rescue:['Prépare le bateau de mission avant de partir.','Secours chacun des trois membres de l’équipage.','Ramène l’équipage au port : le sauvetage ne s’arrête pas au dernier passager.'],
 memory_under_water:['Rejoins la zone de plongée de l’archive engloutie.','Rassemble les trois traces ; une seule ne permet pas de reconstituer le souvenir.','Remonte avec le Souvenir assemblé.'],
 wagon_eight:['Prends le dernier train depuis les Docks.','Cherche le wagon absent pendant ce trajet.','Examine le code des huit valeurs avant de répondre.'],
 blue_blackout:['Répare les trois relais du secteur.','Protège le centre de données pendant son redémarrage.'],
 garden_listens:['Écoute les quatre sons du Jardin.','Reviens observer le Jardin lorsque le brouillard est présent.','Éveille l’arbre-signal avec ta vision de mémoire.'],
 first_foundation:['Rejoins le Bureau d’Urbanisme et scanne le terrain du quartier.','Assemble le tracé de la liaison piétonne.','Pose la première fondation du quartier. Tu peux créer ta propre ville séparément depuis le menu principal.'],
 voices_square:['Écoute les trois habitants de la place.','Scanne la preuve contradictoire, puis présente-la aux habitants.','Organise la rencontre après avoir éclairci le désaccord.'],
 passion_trial:['Termine les trois défis de l’Arène.','Observe la situation et garde le contrôle sous pression.'],
 silent_cable:['Inspecte la ligne du téléphérique.','Répare le pylône repéré sur la ligne.','Accompagne la cabine jusqu’à la station.'],
 three_reflections:['Cherche les trois vitrines lorsque la pluie révèle leurs reflets.','Réunis leurs fragments dans un seul motif.'],
 eight_seeds:['Recueille les huit graines pour Giulia.','Restaure le conservatoire avec les graines réunies.'],
 golden_pattern:['Scanne le motif de l’atelier.','Assemble le matériau à partir du motif.','Personnalise ton objet pour terminer l’ouvrage.'],
 living_fabric:['Inspecte la fibre de Meryem avant de la modifier.','Stabilise sa couleur Matrix.'],
 lost_wolf_signal:['Inspecte les trois traces laissées par l’animal.','Protège l’animal-signal en lui laissant une issue.'],
 broken_record:['Retrouve les trois morceaux audio pour Céline.','Restaure le message avec tous les morceaux réunis.'],
};

export function hubNpcMissionContext(item={},state={}){
 const entries=(item.missionIds||[]).filter(id=>byId[id]).map(id=>({id,mission:byId[id],row:state[id]||{}}));
 const selected=entries.find(entry=>entry.row.status==='active')||entries.find(entry=>entry.row.status==='completed'&&!entry.row.claimed)||entries.find(entry=>!entry.row.claimed&&!hubMissionLockReason(entry.id,state))||entries.find(entry=>!entry.row.claimed)||entries[0];
 if(!selected)return null;
 const {id,mission,row}=selected;
 const step=Math.max(0,Math.min(mission.objectives.length-1,Math.floor(Number(row.completedObjectives)||0)));
 return {...selected,step,objective:mission.objectives[step],hint:HINTS[id]?.[step]||mission.objectives[step],missing:(hubMissionLockReason(id,state)||[]).map(required=>byId[required]?.title||required)};
}

export function hubNpcMissionLine(item,state){
 const context=hubNpcMissionContext(item,state);
 if(!context)return 'Je n’ai pas de mission à te confier. Prends le temps de découvrir le quartier et de parler aux habitants.';
 const {mission,row,hint,missing}=context;
 if(row.status==='completed')return row.claimed?`Tu as mené « ${mission.title} » à son terme. Merci d’avoir tenu cet engagement.`:`« ${mission.title} » est terminée. Retourne au repère de la mission pour récupérer ta récompense.`;
 if(row.status==='active')return row.phase==='FAILED'?`Reprends « ${mission.title} » à ton point de reprise. ${hint}`:`Pour « ${mission.title} » : ${hint}`;
 if(missing.length)return `Avant « ${mission.title} », termine ${missing.map(title=>`« ${title} »`).join(' et ')} et récupère leurs récompenses aux repères des missions.`;
 return `Je peux te confier « ${mission.title} ». Commence cette mission à son point dans la Cité. ${hint}`;
}
