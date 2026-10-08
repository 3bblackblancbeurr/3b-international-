import {hubMissionActionTargets} from './mission-actions.js';

/** Stories belong to the safe city. They do not replace the eight realms' canon. */
export const REFERENCE_CIVIC_LANDMARKS=Object.freeze([
 ['mont-savoirs','Mont des Savoirs','archives','Les bâtisseurs y ont transmis leurs plans et leurs méthodes. On compare les témoignages aux documents, sans effacer les voix différentes.'],
 ['lac-reflets','Lac des Reflets','innovation','L’eau relie visuellement les ateliers aux Archives. Un reflet change avec le point de vue ; une preuve doit pouvoir être vérifiée.'],
 ['pont-civilisations','Pont des Civilisations','community','Les huit héritages empruntent les mêmes passages. Les ouvriers ont construit les arches ensemble pour que chacun puisse rentrer chez lui.'],
 ['place-sol','Place del Sol','arena','Les répétitions commencent lentement et restent lisibles. Les habitants viennent regarder, apprendre et encourager sans transformer la cité en champ de bataille.'],
 ['souks-monde','Souks du Monde','commerce','Les artisans échangent des savoir-faire et racontent la provenance de leurs motifs. Chaque matière conserve la trace des mains qui la travaillent.'],
 ['dolce-vita','Jardins de la Dolce Vita','gardens','Les jardiniers observent la lumière, l’eau et les saisons. Ici, la promenade laisse le temps de discuter et de s’arrêter.'],
 ['rives-soleil','Rives du Soleil','docks','Le matériel de secours est vérifié avant chaque départ. Le port reste un lieu d’accueil où les équipages peuvent préparer leur retour.'],
 ['terrasses-unite','Terrasses de l’Unité','city3b_portal','Les plans de la cité sont discutés entre habitants, ouvriers et créateurs. Une belle vue doit aussi garder des chemins praticables.'],
 ['falaises-orient','Falaises d’Orient','innovation','Les ingénieurs examinent les attaches des câbles et les vents. Le relief a guidé la construction des liaisons, plutôt que de lui servir seulement de décor.'],
 ['vallee-cascades','Vallée des Cascades','gardens','Les cascades rendent audible la hauteur des îlots. Les passerelles permettent d’en observer le mouvement depuis une rive protégée.'],
 ['baie-horizons','Baie des Horizons','docks','Les routes marines traversent la baie entre les falaises. Kadra consigne les observations pour que les prochains voyageurs puissent vérifier le chemin.'],
 ['mer-infinie','Mer Infinie','docks','La mer continue au-delà de la cité. Le hub prépare les départs et les rencontres ; ses histoires se vivent aussi sans franchir une porte.'],
].map(([id,name,district,story])=>Object.freeze({id,name,district,story})));
const places=new Map(REFERENCE_CIVIC_LANDMARKS.map(place=>[place.id,place]));
const resident=(id,buildingId,placeId,craft,partners,service,observation)=>Object.freeze({id,buildingId,placeId,craft,partners:Object.freeze(partners),service,observation});
export const REFERENCE_CIVIC_RESIDENTS=Object.freeze([
 resident('ines_varga','memory_archives','mont-savoirs','classe les enregistrements',['celine_moreau','soraya_najem'],'Aux Archives, tu peux lire la chronologie de la cité et retrouver les missions liées aux souvenirs.','Un document a une date, une origine et parfois une hésitation. Je conserve les trois.'),
 resident('mael_rivière','heritage_welcome','pont-civilisations','accueille les voyageurs',['amira_mansouri','hugo_martel'],'La Maison de l’Accueil présente les premiers pas ; les gares repérées sur la carte permettent de retrouver les quartiers.','Si tu te perds, retrouve la Tour du Cercle Brisé, puis regarde le nom de la passerelle.'),
 resident('celine_moreau','living_cards_gallery','mont-savoirs','restaure les souvenirs',['ines_varga','kadra_zerrouki'],'La Galerie des Cartes Vivantes présente les traces restaurées et les missions correspondantes.','Je note mes réparations. Ceux qui viennent après moi doivent distinguer l’original de ce que j’ai repris.'),
 resident('samir_benyahia','central_marina','baie-horizons','prépare les navettes',['lyna_amrane','youssef_ben_salem'],'La marina présente les trajets de bateau et les points de départ repérés dans la cité.','Une route n’est complète que lorsque l’équipage sait aussi comment rentrer.'),
 resident('lyna_amrane','shipyard_3b','rives-soleil','inspecte les moteurs',['samir_benyahia','arda_kaya'],'Au chantier naval, tu peux consulter les itinéraires et préparer ton prochain départ.','Un petit bruit nouveau mérite un contrôle avant de devenir une grosse panne.'),
 resident('nora_khelifi','house_3b','souks-monde','présente les cartes',['omar_el_fassi','celine_moreau'],'La Maison 3B donne accès à la collection et à la personnalisation.','Deux personnes peuvent décrire le même motif différemment. Je leur demande ce qu’elles ont réellement regardé.'),
 resident('hugo_martel','mobility_center','place-sol','prépare les parcours',['sofia_vega','mael_rivière'],'Le Centre de Mobilité t’aide à préparer tes déplacements ; l’Arène propose un entraînement dans un espace sûr.','On commence par marcher, tourner et s’arrêter proprement. La vitesse vient après.'),
 resident('sofia_vega','arena_3b','place-sol','répète les mouvements',['hugo_martel','adrian_sol'],'L’Arène permet de travailler les gestes et la maîtrise dans la zone d’entraînement.','Je préfère un geste lisible à trois gestes précipités. Le public doit comprendre ce qu’il voit.'),
 resident('leyla_demir','ai_textile_lab','falaises-orient','vérifie les relais',['arda_kaya','lyna_amrane'],'Les ateliers permettent d’examiner les matières et d’ouvrir la personnalisation ; les stations affichent leurs liaisons.','Une cabine, son câble et ses deux attaches forment un seul système.'),
 resident('maarja_saar','workers_memorial','vallee-cascades','relève les signaux',['giulia_ferri','kadra_zerrouki'],'Le Mémorial et les Jardins gardent les traces des ouvriers et les missions du quartier.','Écoute depuis deux endroits. La cascade la plus forte n’est pas forcément la plus proche du chemin.'),
 resident('giulia_ferri','wildlife_refuge','dolce-vita','soigne les plantes',['evelin_tamm','maarja_saar'],'Le Refuge et les Jardins réunissent les missions de botanique et de protection du vivant.','Je vérifie la terre avant d’arroser. Prendre soin demande parfois de ne rien ajouter.'),
 resident('omar_el_fassi','house_3b','souks-monde','assemble les motifs',['meryem_alaoui','nora_khelifi'],'La Maison 3B et les ateliers donnent accès aux collections et à la personnalisation.','Quand une pièce ne s’accorde pas aux autres, je reprends la règle avant de refaire la surface.'),
 resident('amira_mansouri','community_house','pont-civilisations','accueille les habitants',['lucia_navaro','soraya_najem'],'La Maison des Liens accueille les rencontres et la mission qui permet d’écouter plusieurs habitants.','Avant de répondre, je laisse chaque personne terminer sa phrase.'),
 resident('elio_romano','city_planning_office','terrasses-unite','étudie les plans',['arda_kaya','amira_mansouri'],'Le Bureau d’Urbanisme et la Galerie ouvrent Créer ma Ville ; sa progression reste indépendante de celle du hub.','Sur un plan, je trace d’abord les trajets du matin et du retour. Les façades viennent autour.'),
 resident('arda_kaya','mode3_studio','lac-reflets','contrôle le réseau',['leyla_demir','meryem_alaoui'],'Le Studio et le Laboratoire proposent les palettes et les matières, puis l’accès à la personnalisation.','Une lumière bleue peut indiquer une panne ou un fonctionnement normal. Je compare les relais avant de conclure.'),
 resident('evelin_tamm','wildlife_refuge','dolce-vita','veille sur les animaux',['giulia_ferri','youssef_ben_salem'],'Le Refuge permet de retrouver les missions de protection de l’animal-signal.','J’approche lentement et je garde une sortie libre. Un animal inquiet n’a pas besoin d’un public autour de lui.'),
 resident('youssef_ben_salem','central_marina','rives-soleil','vérifie le matériel de secours',['samir_benyahia','evelin_tamm'],'À la marina, vérifie l’itinéraire et retrouve les missions du port avant d’embarquer.','Je compte le matériel avec quelqu’un d’autre. Deux regards évitent un oubli.'),
 resident('lucia_navaro','community_house','pont-civilisations','prépare les rencontres',['amira_mansouri','adrian_sol'],'La Maison des Liens présente les missions et les rencontres du quartier.','Un événement doit laisser une place à ceux qui préfèrent écouter plutôt que monter sur scène.'),
 resident('meryem_alaoui','house_3b','souks-monde','travaille les textiles',['omar_el_fassi','arda_kaya'],'Les ateliers de matière permettent d’examiner une palette, puis de poursuivre dans la personnalisation.','Une fibre doit rester agréable même lorsque ses lumières sont éteintes.'),
 resident('noah_leroux','tower_circle','lac-reflets','observe les fréquences',['ines_varga','leyla_demir'],'La Tour permet de retrouver les fragments et d’observer la cité depuis ses galeries accessibles.','La cité a été assemblée par des personnes. Le Cercle doit conserver leurs différences autant que leurs liens.'),
 resident('the_conductor','train_station','baie-horizons','veille sur le dernier départ',['samir_benyahia','ines_varga'],'La gare présente le 3B Express et ses quartiers. Le Wagon 8 appartient à une mission, pas à une promesse d’horaire public.','Le dernier train garde son secret. La ligne ordinaire, elle, doit être compréhensible pour tout le monde.'),
 resident('kadra_zerrouki','central_marina','mer-infinie','compare les cartes marines',['samir_benyahia','celine_moreau'],'À la marina, compare les routes ; les Archives conservent les souvenirs que le port ramène.','Je marque l’endroit où une observation a été faite. Une carte sans point de vue cache la moitié de son histoire.'),
 resident('adrian_sol','arena_3b','place-sol','prépare les défis',['sofia_vega','lucia_navaro'],'L’Arène propose un entraînement. Tu peux t’arrêter, observer les gestes et reprendre à ton rythme.','Un bon commentaire aide à comprendre un mouvement, sans humilier celui qui apprend.'),
 resident('soraya_najem','community_house','pont-civilisations','recueille les témoignages',['ines_varga','amira_mansouri'],'La Maison des Liens et les Archives donnent des versions à comparer dans les missions de la cité.','Je demande si mes notes disent bien ce que la personne voulait dire avant de les transmettre.'),
]);
const residents=new Map(REFERENCE_CIVIC_RESIDENTS.map(row=>[row.id,row]));
const residentId=item=>typeof item==='string'?item:item?.npcId||item?.id?.replace(/^hub:npc:/,'')||'';
const hash=id=>[...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
const names=Object.freeze({ines_varga:'Inès',mael_rivière:'Maël',celine_moreau:'Céline',samir_benyahia:'Samir',lyna_amrane:'Lyna',nora_khelifi:'Nora',hugo_martel:'Hugo',sofia_vega:'Sofia',leyla_demir:'Leyla',maarja_saar:'Maarja',giulia_ferri:'Giulia',omar_el_fassi:'Omar',amira_mansouri:'Amira',elio_romano:'Elio',arda_kaya:'Arda',evelin_tamm:'Evelin',youssef_ben_salem:'Youssef',lucia_navaro:'Lucía',meryem_alaoui:'Meryem',noah_leroux:'Noah',the_conductor:'le Conducteur',kadra_zerrouki:'Kadra',adrian_sol:'Adrián',soraya_najem:'Soraya'});
export function referenceResidentProfile(item){return residents.get(residentId(item))||null;}
export function referenceLandmark(id){return places.get(id)||null;}
export function referenceResidentMoment(item,{hour=12,day=1,weather='clear'}={}){
 const profile=referenceResidentProfile(item);if(!profile)return null;
 const h=((Number(hour)||0)%24+24)%24,d=Math.max(0,Math.floor(Number(day)||0)),place=places.get(profile.placeId),partnerId=profile.partners[(hash(profile.id)+d)%profile.partners.length];
 const shelter=['rain','heavy_rain','storm','snow'].includes(weather),night=h<6||h>=22,lunch=h>=12&&h<14,evening=h>=18&&h<22;
 const activityLabel=shelter?profile.craft+' à couvert':night?'range le matériel et prépare la relève':h<9?'prépare son lieu avant l’ouverture':lunch?'échange des nouvelles avec '+names[partnerId]:evening?'partage ses observations avec '+names[partnerId]:profile.craft;
 return {profile,placeId:place.id,placeName:place.name,partnerId,partnerName:names[partnerId],activityLabel,conversation:shelter?'Je poursuis mon travail à couvert. '+profile.observation:lunch||evening?'Je viens d’échanger avec '+names[partnerId]+'. '+profile.observation:profile.observation};
}
export function referenceResidentStory(item,topic='district',context={}){
 const moment=referenceResidentMoment(item,context);if(!moment)return null;
 const {profile,placeName,partnerName}=moment;
 if(topic==='work')return 'Mon travail : je '+profile.craft+'. '+profile.service;
 if(topic==='neighbors')return 'Je travaille aussi avec '+partnerName+'. '+profile.observation;
 if(topic==='routes')return 'Les gares et les liaisons visibles sur la carte correspondent aux trajets de la cité. '+profile.service;
 if(topic==='district')return placeName+' : '+places.get(profile.placeId).story+' '+profile.observation;
 return moment.conversation;
}

/** Clues name only the actions that actually remain available to this save. */
export function referenceMissionClue(missionId,row,recorded=[]){
 if(!row||row.status!=='active')return null;
 const remaining=hubMissionActionTargets(missionId,row,recorded);
 if(remaining.length)return 'Dans ce quartier, cherche « '+remaining.slice(0,3).map(action=>action.label).join(' », puis « ')+' ».';
 const signals={first_steps:['Entre dans la Maison de l’Accueil.','Utilise une gare du 3B Express et choisis un trajet.','Retrouve la borne de la Place de l’Héritage.'],boat_without_flag:['Utilise un départ de bateau à la marina.','Inspecte le quai lié au secret du bateau sans pavillon.'],wagon_eight:['Utilise la gare du 3B Express.','Retrouve le Conducteur lorsqu’il est présent de nuit.','Entre dans la Gare 3B.'],three_reflections:['Observe les étapes du secret des reflets sous la pluie.','Termine le secret des trois reflets.'],broken_record:['Lis les étapes de la chronologie à rebours.','Termine le secret de l’enregistrement inversé.']};
 return signals[missionId]?.[Math.max(0,Math.floor(Number(row.completedObjectives)||0))]||null;
}
