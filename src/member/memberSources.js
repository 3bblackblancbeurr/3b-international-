/**
 * 3B member source register: editorial links, not endorsement or partnership claims.
 * Only public external destinations. No accounts, cookies or tracking in this module.
 */
export const CONTACT_EMAIL = '3bblackblancbeurr@gmail.com';
export const contactHref = subject => 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject);

export const MEMBER_SPACES = Object.freeze([
  { id:'loyalty', name:'Fidélité', eyebrow:'TES AVANTAGES', tagline:'Ta carte. Tes points. Ton histoire.', icon:'wallet', hint:'Carte boutique et XP existantes.' },
  { id:'news', name:'Le monde en direct', eyebrow:'ACTUALITÉS & ÉVÉNEMENTS', tagline:'Ouvre une fenêtre sur le monde.', icon:'globe', hint:'Sources identifiées, actualité externe.' },
  { id:'association', name:'Association 3B', eyebrow:'CONSTRUIRE ENSEMBLE', tagline:'Une cause. Des rencontres. Des actions.', icon:'heart', hint:'Prépare et suis ton initiative sur cet appareil.' },
  { id:'partners', name:'Partenaires', eyebrow:'COLLABORATIONS', tagline:'Faire grandir les idées ensemble.', icon:'handshake', hint:'Construis ta proposition et garde le fil des échanges.' },
  { id:'finance', name:'Banque & crypto', eyebrow:'LE LABORATOIRE FINANCIER', tagline:'Garder le contrôle de ses choix.', icon:'landmark', hint:'Portefeuille et opérations en simulation, avec unités fictives.' },
  { id:'travel', name:'Voyage 3B', eyebrow:'EXPLORER LE MONDE', tagline:'Le monde est plus grand qu’un écran.', icon:'plane', hint:'Tes destinations, tes étapes et ton budget prévisionnel.' },
  { id:'join', name:'Nous recherchons', eyebrow:'REJOINDRE L’AVENTURE', tagline:'Chaque talent change quelque chose.', icon:'users', hint:'Prépare une proposition de participation à ton rythme.' },
  { id:'tv', name:'3B Origins TV', eyebrow:'CRÉATION ORIGINALE', tagline:'Des histoires qui prennent vie.', icon:'tv', hint:'Neuf récits audio, textes et progression locale.' },
  { id:'admin', name:'Administratif', eyebrow:'LA VIE, PLUS SIMPLE', tagline:'Le bon service. Au bon moment.', icon:'file', hint:'Organise ton suivi et retrouve les organismes officiels.' },
  { id:'cinema', name:'Cinéma', eyebrow:'HISTOIRES À DÉCOUVRIR', tagline:'Le cinéma, du bon côté de l’écran.', icon:'film', hint:'Ta liste personnelle, tes notes et les sources légales.' },
]);

export const COUNTRY_INDEX = Object.freeze([
  ['FR','France','fr','🇫🇷','https://www.france.fr/fr/'],
  ['DZ','Algérie','fr','🇩🇿','https://www.ont.dz/'],
  ['MA','Maroc','fr','🇲🇦','https://www.visitmorocco.com/fr'],
  ['TN','Tunisie','fr','🇹🇳','https://www.discovertunisia.com/'],
  ['ES','Espagne','es','🇪🇸','https://www.spain.info/fr/'],
  ['IT','Italie','it','🇮🇹','https://www.italia.it/fr'],
  ['TR','Turquie','tr','🇹🇷','https://goturkiye.com/'],
  ['EE','Estonie','et','🇪🇪','https://visitestonia.com/fr'],
  ['GB','Royaume-Uni','en','🇬🇧','https://www.visitbritain.com/'],
  ['DE','Allemagne','de','🇩🇪','https://www.germany.travel/fr/home.html'],
  ['BE','Belgique','fr','🇧🇪','https://visitwallonia.be/fr-be'],
  ['CH','Suisse','fr','🇨🇭','https://www.myswitzerland.com/fr/'],
  ['PT','Portugal','pt','🇵🇹','https://www.visitportugal.com/fr'],
  ['NL','Pays-Bas','nl','🇳🇱','https://www.holland.com/fr/tourisme.htm'],
  ['PL','Pologne','pl','🇵🇱','https://www.poland.travel/fr/'],
  ['GR','Grèce','el','🇬🇷','https://www.visitgreece.gr/'],
  ['IE','Irlande','en','🇮🇪','https://www.ireland.com/fr-fr/'],
  ['US','États-Unis','en','🇺🇸','https://www.visittheusa.com/'],
  ['CA','Canada','en','🇨🇦','https://travel.destinationcanada.com/fr-ca'],
  ['BR','Brésil','pt','🇧🇷','https://visitbrasil.com/'],
  ['MX','Mexique','es','🇲🇽','https://visitmexico.com/'],
  ['JP','Japon','ja','🇯🇵','https://www.japan.travel/fr/'],
  ['KR','Corée du Sud','ko','🇰🇷','https://english.visitkorea.or.kr/'],
  ['IN','Inde','en','🇮🇳','https://www.incredibleindia.gov.in/'],
  ['CN','Chine','zh','🇨🇳','https://www.travelchinaguide.com/'],
  ['AU','Australie','en','🇦🇺','https://www.australia.com/fr-fr'],
  ['NZ','Nouvelle-Zélande','en','🇳🇿','https://www.newzealand.com/fr/'],
  ['ZA','Afrique du Sud','en','🇿🇦','https://www.southafrica.net/'],
  ['SN','Sénégal','fr','🇸🇳','https://www.au-senegal.com/'],
  ['CI','Côte d’Ivoire','fr','🇨🇮','https://tourismecotedivoire.ci/'],
  ['EG','Égypte','ar','🇪🇬','https://www.experienceegypt.eg/'],
  ['AE','Émirats arabes unis','ar','🇦🇪','https://u.ae/'],
  ['SA','Arabie saoudite','ar','🇸🇦','https://www.visitsaudi.com/fr'],
  ['QA','Qatar','ar','🇶🇦','https://visitqatar.com/fr-fr'],
  ['SE','Suède','sv','🇸🇪','https://visitsweden.com/'],
  ['NO','Norvège','no','🇳🇴','https://www.visitnorway.fr/'],
  ['FI','Finlande','fi','🇫🇮','https://www.visitfinland.com/fr/'],
]);
export const countryFor = code => COUNTRY_INDEX.find(row=>row[0]===code) || COUNTRY_INDEX[0];
export function countryNewsHref(code){
  const country=countryFor(code);
  // Google News opens a public results page. No article is falsely attributed to 3B.
  const q=new URLSearchParams({q:country[1],hl:'fr',gl:'FR',ceid:'FR:fr'});
  return 'https://news.google.com/search?'+q.toString();
}
export function countryEventsHref(code) {
  const country=countryFor(code);
  if(code==='FR')return 'https://openagenda.com/fr';
  // Explicitly an external event search rather than a fabricated event listing.
  return 'https://www.google.com/search?'+new URLSearchParams({q:'événements culturels concerts expositions '+country[1]}).toString();
}

export const ADMIN_GUIDES = Object.freeze([
  {title:'Identité & papiers',description:'Carte d’identité, passeport, titres et rendez-vous.',href:'https://www.service-public.gouv.fr/particuliers/vosdroits/N358',icon:'file'},
  {title:'Travail & formation',description:'Emploi, droits et recherche de formation.',href:'https://www.francetravail.fr/',icon:'users'},
  {title:'Logement & aides',description:'APL, CAF, logement et prestations.',href:'https://www.caf.fr/',icon:'home'},
  {title:'Santé & droits',description:'Assurance maladie, remboursements et attestations.',href:'https://www.ameli.fr/',icon:'heart'},
  {title:'Impôts',description:'Déclarations, espace particulier et paiements.',href:'https://www.impots.gouv.fr/',icon:'file'},
  {title:'Entreprise & association',description:'Création, modifications et formalités.',href:'https://formalites.entreprises.gouv.fr/',icon:'briefcase'},
  {title:'Justice & droits',description:'Procédures, aide juridique et recours.',href:'https://www.justice.fr/',icon:'landmark'},
  {title:'Démarches en Europe',description:'Séjour, emploi, droits et déplacements dans l’UE.',href:'https://europa.eu/youreurope/citizens/index_fr.htm',icon:'globe'},
]);
export const CINEMA_GUIDES = Object.freeze([
  {title:'ARCOM · offre légale',description:'Vérifier qu’un service de cinéma est légal.',href:'https://www.service-public.gouv.fr/particuliers/vosdroits/R37057'},
  {title:'ARTE Cinéma',description:'Films à regarder légalement selon disponibilité et territoire.',href:'https://www.arte.tv/fr/videos/cinema/'},
  {title:'France.tv',description:'Programmes et films selon les droits de diffusion.',href:'https://www.france.tv/'},
  {title:'TV5MONDEplus',description:'Films et séries francophones, accès selon pays.',href:'https://www.tv5mondeplus.com/'},
]);
export const FINANCE_GUIDES = Object.freeze([
  {title:'Banque de France',description:'Comprendre ses droits bancaires et les moyens de paiement.',href:'https://www.banque-france.fr/fr'},
  {title:'AMF · placements',description:'Vérifier les alertes et les prestataires autorisés.',href:'https://www.amf-france.org/fr'},
  {title:'AMF · crypto MiCA',description:'Vérifier le cadre européen et les prestataires de crypto-actifs.',href:'https://www.amf-france.org/fr/actualites-publications/dossiers-thematiques/mica'},
  {title:'Cybermalveillance.gouv.fr',description:'Réagir aux fraudes et escroqueries en ligne.',href:'https://www.cybermalveillance.gouv.fr/'},
]);
export const OPPORTUNITIES = Object.freeze([
  {title:'Créateurs & artistes',text:'Illustration, vêtements, musique, cinéma, narration et vidéo.'},
  {title:'Développeurs & game artists',text:'Expériences interactives, interfaces mobiles, 3D, monde 3B.'},
  {title:'Associations & acteurs locaux',text:'Initiatives solidaires, rencontres interculturelles et actions de terrain.'},
  {title:'Partenaires & marques',text:'Production, distribution, e-sport et projets communs.'},
  {title:'Testeurs de l’application',text:'Retours sur accessibilité, fluidité et parcours réels.'},
]);
