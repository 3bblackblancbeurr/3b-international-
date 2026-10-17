// Adapted creative brief ideas from the user's visual references. These are
// descriptive presets, NOT secret slash commands or an AI image service.
export const VISUAL_FAMILIES=Object.freeze([
 {id:'world',label:'Monde & international',tone:'WORLD',presets:[
  ['bluemarble','Planète vivante','Vue spatiale de la Terre, lumière de bord atmosphérique, réseaux lumineux stylisés et 3B international'],
  ['mapworld','Carte du monde','Vue cartographique nocturne avec continents lisibles, routes et repères sélectionnables'],
  ['citystreet','Cité des huit royaumes','Rue habitée, perspective architecturale premium, lumière de fin de journée'],
  ['nightcity','Métropole du futur','Ville cosmopolite de nuit, silhouettes architecturales raffinées et reflets or'],
  ['opportunity','Routes d’opportunités','Réseau mondial lisible de voyages, collaborations, culture et entrepreneuriat'],
  ['welcomescreen','Ouverture 3B','Écran d’accueil immersif à composition centrale et navigation discrète']
 ]},
 {id:'albert',label:'IA & concierge',tone:'APEX',presets:[
  ['holoavatar','Portrait holographique','Assistant IA holographique expressif, portrait de trois quarts, lumière cyan et or'],
  ['timeline','Timeline vivante','Parcours personnel lisible avec activités réellement choisies par le membre'],
  ['onboarding','Onboarding premium','Entrée guidée progressive en trois gestes, identité visuelle 3B'],
  ['recommend','Recommandations du jour','Suggestions éditoriales personnalisables, sans prétendre connaître le membre'],
  ['windowlight','Portrait lumière fenêtre','Portrait réaliste, lumière latérale douce et finesse des yeux'],
  ['rimlight','Halo de contour','Liseré lumineux cyan-or, profondeur cinématique et portrait net']
 ]},
 {id:'games',label:'Jeux & e-sport',tone:'PLAY',presets:[
  ['screenpic','Capture de jeu','Véritable mise en scène du gameplay, HUD discret et composition lisible'],
  ['bossscene','Combat de gardien','Confrontation spectaculaire, lisibilité des silhouettes et impacts'],
  ['rolecard','Fiche de personnage','Caractéristiques, emblème, équipement et progression non trompeuse'],
  ['mapdraw','Carte de jeu','Carte illustrée lisible avec lieux, objectifs et itinéraires cohérents'],
  ['skilltree','Arbre de compétences','Branches de progression hiérarchisées, liens et états interactifs'],
  ['leaderboard','Classement compétitif','Hiérarchie visuelle claire, équipes, points et rangs vérifiés'],
  ['achievement','Badge de réussite','Emblème de succès, métal champagne, symbole précis, sans promesse fictive'],
  ['loadpic','Écran de chargement','Visuel cinématique léger, étapes et progression authentiques'],
  ['seasonpass','Parcours de saison','Progression par niveaux, récompenses réelles et transparence']
 ]},
 {id:'portrait',label:'Avatar & autre monde',tone:'PORTRAIT',presets:[
  ['kingpose','Portrait royal','Personnage sur un trône original, détails textiles et lumière or'],
  ['warriorpose','Guerrier des royaumes','Personnage dans un univers fantastique original, pose vivante et équipement'],
  ['wizardpose','Sage lumineux','Portrait de mage original, architecture ancienne et énergie subtile'],
  ['explorerpose','Explorateur d’un autre monde','Explorateur dans un paysage grandiose, mouvement et profondeur'],
  ['armourpose','Chevalier du cercle','Armure métal sombre, détails 3B, lumière de contre-jour'],
  ['profileview','Profil lumineux','Portrait entièrement de profil avec halo subtil et contraste précis'],
  ['threequarter','Trois quarts cinéma','Portrait de trois quarts, profondeur de champ et finesse du regard'],
  ['silhouette','Silhouette crépusculaire','Personnage en contre-jour devant un ciel spectaculaire']
 ]},
 {id:'cuisine',label:'Cuisine & santé',tone:'VITAL',presets:[
  ['platebeauty','Assiette gastronomique','Dressage lumineux de vrais ingrédients avec textures lisibles'],
  ['stepcook','Cuisine pas à pas','Quatre étapes réalistes et distinctes d’une recette documentée'],
  ['freshcut','Fruits frais','Découpe fraîche, gouttelettes, éclat naturel et belle lumière'],
  ['marketproduce','Marché de producteurs','Étal coloré de légumes de saison, convivialité authentique'],
  ['kitchenaction','Chef en cuisine','Scène de préparation réaliste, geste précis et environnement propre'],
  ['herbgarnish','Finition d’un plat','Herbes fraîches, macro des textures, rendu gastronomique'],
  ['teasteam','Thé du matin','Vapeur discrète, lumière douce, composition élégante']
 ]},
 {id:'travel',label:'Maison & voyage',tone:'VOYAGE',presets:[
  ['frontview','Architecture d’exception','Façade contemporaine premium, jour et nuit, lignes claires'],
  ['rooftop','Toit-terrasse','Horizon au crépuscule depuis un toit-terrasse végétalisé'],
  ['coastline','Littoral vivant','Côte rocheuse, eau turquoise et atmosphère lumineuse'],
  ['mountain','Haute montagne','Chaîne montagneuse à grande profondeur et lumière dorée'],
  ['forestpath','Chemin forestier','Sentier de forêt avec lumière naturelle filtrée'],
  ['kitchenview','Cuisine rénovée','Pièce lumineuse fonctionnelle et chaleureuse'],
  ['citystreet','Ville habitée','Rue urbaine animée, architecture réaliste et diversité de perspectives']
 ]},
 {id:'business',label:'Business & réseaux',tone:'BUSINESS',presets:[
  ['launchpic','Lancement premium','Visuel de lancement de marque, message unique et hiérarchie nette'],
  ['webbanner','Bannière panoramique','Format 16:9, espace réservé au texte et au logo 3B'],
  ['storyad','Story verticale','Affiche sociale 9:16 avec sujet central fort et texte court'],
  ['onboarding','Écran de bienvenue','Onboarding premium épuré, navigation guidée'],
  ['featurecard','Fonctionnalité vedette','Une fonction expliquée visuellement sans multiples cadres'],
  ['numbers','Chiffre clé','Statistique explicitement sourcée, typographie monumentale'],
  ['eventinvite','Invitation événement','Date, lieu et informations vérifiables, design de prestige']
 ]},
 {id:'brand',label:'Boutique, art & packaging',tone:'ATELIER',presets:[
  ['kitbox','Coffret ouvert','Packaging haut de gamme présenté ouvert, matière et détails lisibles'],
  ['giftwrap','Paquet cadeau','Ruban champagne, papier texturé et lumière studio'],
  ['boxprint','Boîte imprimée','Imprimé de marque précis sur boîte premium, angles multiples'],
  ['bagprint','Sac boutique','Sac de shopping structuré, matière réaliste et logo juste'],
  ['tinpackage','Écrin métallique','Boîte métallique à charnière, reflets réalistes'],
  ['bottlelabel','Étiquette produit','Étiquette lisible sur flacon, composition maîtrisée'],
  ['digitalpaint','Art numérique','Peinture numérique minutieuse au thème 3B'],
  ['watercolor','Aquarelle diffuse','Illustration au pigment humide avec bords naturels'],
  ['inksketch','Dessin à l’encre','Traits fins et détails sur papier grainé']
 ]}
]);
export const VISUAL_COUNTS=VISUAL_FAMILIES.reduce((n,c)=>n+c.presets.length,0);
export const VISUAL_RATIOS=Object.freeze([
 {id:'mobile',label:'Mobile 9:16',ratio:'9:16',resolution:'1080 × 1920'},
 {id:'wide',label:'Écran 16:9',ratio:'16:9',resolution:'1920 × 1080'},
 {id:'square',label:'Carré 1:1',ratio:'1:1',resolution:'1080 × 1080'}
]);
export function makeVisualBrief({family,preset,subject='',ratio='mobile',notes=''}) {
 const category=VISUAL_FAMILIES.find(f=>f.id===family)||VISUAL_FAMILIES[0];
 const chosen=category.presets.find(p=>p[0]===preset)||category.presets[0];
 const size=VISUAL_RATIOS.find(r=>r.id===ratio)||VISUAL_RATIOS[0];
 const clean=value=>String(value||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,480);
 return [
  '3B INTERNATIONAL · STUDIO VISUEL — BRIEF CRÉATIF',
  'Direction : MASTER 3B / Concepts 13 et 14 (inspiration, pas reproduction aveugle)',
  'Famille : '+category.label,
  'Scène : '+chosen[1],
  'Sujet : '+(clean(subject)||'Sujet à définir'),
  'Format : '+size.ratio+' · '+size.resolution,
  'Intention artistique : '+chosen[2]+'.',
  'Identité : noir profond, or champagne, bleu lumineux, textures crédibles, relief, profondeur, lumière maîtrisée, composition unique.',
  'Exigences : focalisation nette, cohérence d’échelle, lisibilité mobile, bon contraste, perspective naturelle.',
  'UI 3B : éviter les cartes et cadres décoratifs, privilégier une vraie scène et les actions essentielles.',
  'Réalité : ne pas inventer de membres, chiffres, avis, lieux, partenariats, contenus protégés ou certifications.',
  'Détails : '+(clean(notes)||'Aucun détail supplémentaire'),
  'Contrôle qualité : comparer au brief, examiner les défauts, vérifier l’absence de texte déformé, contrôler le rendu 9:16 / 16:9 et l’accessibilité.',
  'Usage : brief à copier dans un outil de création. Aucun rendu IA n’est lancé automatiquement.',
 ].join('\n');
}
