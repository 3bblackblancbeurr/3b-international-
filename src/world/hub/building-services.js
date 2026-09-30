import plan from './data/hub-master-plan-v2.json' with {type:'json'};
import missions from './data/missions-v1.json' with {type:'json'};

const panel=(label,target)=>({label,kind:'panel',target});
const route=(label,target)=>({label,kind:'route',target});
export const HUB_BUILDING_PANEL_TARGETS=Object.freeze(['journal','atlas','wardrobe','collection','team','party','arena','avatar','pause','service:garage','service:textile','service:gallery','service:memorial','service:refuge']);
export const HUB_BUILDING_ROUTE_TARGETS=Object.freeze(['shop','city3b']);
const journal=()=>panel('Consulter les missions','journal');
const map=()=>panel('Repérer les lieux sur la carte','atlas');

export const HUB_BUILDING_SERVICES=Object.freeze({
 tower_circle:{purpose:'La Tour relie les fragments de mémoire aux huit portes. Son cercle brisé reste le repère commun de la Cité.',hook:'Poursuis Les Huit Signaux avec Noah pour comprendre la porte instable.',missions:['eight_signals'],actions:[map(),journal()],unavailable:[]},
 heritage_welcome:{purpose:'La Maison de l’Accueil donne à chaque arrivant ses premiers repères dans la Cité.',hook:'Maël te propose de visiter cette maison, prendre le 3B Express puis revenir sur la Place.',missions:['first_steps'],actions:[journal(),map(),panel('Régler les commandes et les sons','pause')],unavailable:[]},
 mission_hotel:{purpose:'Les affaires des quartiers se rejoignent ici : les souvenirs, les habitants et les infrastructures ont besoin de ton aide.',hook:'Le journal indique les prérequis et la progression de chaque mission. Rejoins ensuite son repère dans la Cité.',missions:['first_steps','voices_square'],actions:[journal(),map()],unavailable:[]},
 memory_archives:{purpose:'Les Archives rassemblent les traces du passé et les souvenirs à restaurer.',hook:'Inès suit le Premier Écho. Céline recherche les morceaux de l’Enregistrement Brisé.',missions:['first_echo','broken_record'],actions:[journal(),panel('Ouvrir les Cartes Vivantes','collection')],unavailable:[]},
 living_cards_gallery:{purpose:'La Chambre des Cartes Vivantes conserve les liens noués avec les personnages de ton aventure.',hook:'Consulte les compagnons rencontrés et prépare ton équipe avant de repartir.',missions:[],actions:[panel('Voir ma collection','collection'),panel('Préparer mon équipe','team')],unavailable:['Invitations de personnages dans la Ville 3B']},
 arena_3b:{purpose:'L’Arène accueille les confrontations et les épreuves de maîtrise du quartier.',hook:'Hugo accompagne Les Toits du Cercle ; Sofia propose ensuite l’Épreuve de la Passion.',missions:['rooftops_circle','passion_trial'],actions:[panel('Ouvrir l’arène en ligne','arena'),journal()],unavailable:['Simulation dédiée des boss du hub']},
 mobility_center:{purpose:'Le Centre de Mobilité sert de point de préparation aux parcours des toits et aux traversées de la Cité.',hook:'Retrouve les étapes des Toits du Cercle, puis utilise la carte pour orienter ton parcours.',missions:['rooftops_circle'],actions:[journal(),map(),panel('Ajuster mes commandes','pause')],unavailable:['Classement des contre-la-montre']},
 house_3b:{purpose:'La Maison 3B relie les collections de la marque à la vie du quartier Commerce.',hook:'La boutique de l’application et tes tenues du Monde disposent de leurs propres espaces.',missions:['golden_pattern','living_fabric'],actions:[route('Ouvrir la boutique 3B','shop'),panel('Voir mes tenues du Monde','wardrobe')],unavailable:[]},
 garage_3b:{purpose:'Le Garage est le point de repère des véhicules et de la personnalisation dans le quartier Commerce.',hook:'Pour tes déplacements actuels, retrouve les stations de train, les quais et les téléphériques sur la carte.',missions:[],actions:[map(),panel('Personnaliser mon personnage','avatar')],unavailable:['Véhicules personnels à conduire','Contrats de livraison du Garage']},
 community_house:{purpose:'La Maison de la Communauté rapproche les habitants et les voyageurs de la Cité.',hook:'Amira accompagne Les Voix de la Place : écouter les habitants précède la résolution de leur désaccord.',missions:['voices_square'],actions:[panel('Retrouver mon groupe','party'),journal()],unavailable:['Profils et échanges de la communauté de l’application']},
 ai_textile_lab:{purpose:'Le laboratoire est le repère de la recherche textile dans le quartier Innovation.',hook:'Arda cherche à rétablir les relais de la Panne Bleue. Leyla intervient ensuite sur le Câble Silencieux.',missions:['blue_blackout','silent_cable'],actions:[journal(),map()],unavailable:['Génération IA : fournisseur non activé sur le serveur']},
 mode3_studio:{purpose:'Le Studio Mode 3 IA est le repère du style et de la préparation de ton apparence.',hook:'Ajuste ton personnage ou choisis parmi les tenues déjà accessibles dans le Monde.',missions:[],actions:[panel('Personnaliser mon personnage','avatar'),panel('Choisir une tenue du Monde','wardrobe')],unavailable:['Assistants IA : fournisseurs non activés sur le serveur']},
 central_marina:{purpose:'La Gare Maritime relie les Docks aux Jardins, à la Ville 3B, au Commerce et à la Place.',hook:'Rejoins un arrêt Bateau-taxi pour embarquer. Samir suit la piste du Bateau sans Pavillon.',missions:['boat_without_flag'],actions:[map(),journal()],unavailable:['Billetterie et réservation de traversées']},
 shipyard_3b:{purpose:'Le Chantier Naval est le repère des missions maritimes et du sauvetage aux Docks.',hook:'Après Le Bateau sans Pavillon, retrouve Youssef pour le Sauvetage dans la Tempête.',missions:['storm_rescue','memory_under_water'],actions:[journal(),map()],unavailable:['Réparation et personnalisation d’un bateau personnel']},
 train_station:{purpose:'Le 3B Express parcourt les dix quartiers en boucle et offre une alternative aux longues marches.',hook:'Monte à une station pour rejoindre l’arrêt suivant. Le Conducteur se montre la nuit aux Docks.',missions:['first_steps','wagon_eight'],actions:[map(),journal()],unavailable:[]},
 workers_memorial:{purpose:'Le Mémorial garde les noms des ouvriers et la mémoire de celles et ceux qui ont construit la Cité.',hook:'Cherche les huit noms du mémorial dans les Jardins. Chaque nom découvert reste enregistré.',missions:[],actions:[map(),journal()],unavailable:[]},
 wildlife_refuge:{purpose:'Le Refuge invite à observer les animaux et à protéger les traces vivantes des Jardins.',hook:'Évelin suit le Signal du Loup ; Maarja écoute les sons du Jardin.',missions:['garden_listens','lost_wolf_signal'],actions:[journal(),panel('Voir les compagnons rencontrés','collection')],unavailable:[]},
 city_planning_office:{purpose:'Le Bureau d’Urbanisme relie ton aventure à la construction de ta Ville 3B.',hook:'Élio te propose de relever un terrain, tracer une liaison et poser une fondation dans ce quartier. Créer ma Ville reste un jeu indépendant.',missions:['first_foundation'],actions:[route('Créer ma Ville','city3b'),journal()],unavailable:[]},
 city_gallery:{purpose:'La Galerie des Villes 3B ouvre un passage vers l’espace de ta ville et son évolution.',hook:'Retrouve ta ville dans son espace dédié. Sa création et sa progression sont indépendantes du Monde.',missions:['first_foundation'],actions:[route('Créer ma Ville','city3b'),journal()],unavailable:['Classement des villes depuis la Galerie']},
});

export function hubBuildingService(item,save){
 const id=item?.buildingId||item?.id,building=plan.buildings.find(row=>row.id===id),service=HUB_BUILDING_SERVICES[id];
 if(!building||!service)return null;
 const workshops={garage_3b:['Composer une livrée','garage'],shipyard_3b:['Dessiner une livrée nautique','garage'],ai_textile_lab:['Créer une tenue','textile'],mode3_studio:['Ouvrir mon atelier de style','textile'],workers_memorial:['Ouvrir le carnet des hommages','memorial'],wildlife_refuge:['Préparer le refuge','refuge'],city_gallery:['Ouvrir ma galerie personnelle','gallery'],house_3b:['Créer une tenue du Monde','textile']};
 const workshop=workshops[id];
 return {...service,actions:workshop?[panel(workshop[0],'service:'+workshop[1]),...service.actions]:service.actions,id,name:building.name,district:plan.districts.find(row=>row.id===building.district)?.name||building.district,
  missions:service.missions.map(missionId=>{
   const mission=missions.find(row=>row.id===missionId),progress=save?.hub?.missions?.[missionId];
   return {id:missionId,title:mission.title,status:progress?.claimed?'Récompense reçue':progress?.status==='completed'?'Récompense à récupérer':progress?.status==='active'?'En cours':'À découvrir'};
  }),
 };
}
