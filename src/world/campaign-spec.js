// Executable realm campaigns. Every row names a physical interaction; runtime
// owns order, materials, trial clocks, consequences and the reward ledger.
const choice=(id,label)=>({id,label});
const point=(id,name,dialogue,extra={})=>({id,name,dialogue,...extra});
const phase=(id,title,steps,extra={})=>({id,title,steps,...extra});
const decision=(id,name,dialogue,answer,labels,extra={})=>point(id,name,dialogue,{answer,choices:labels.map(([id,label])=>choice(id,label)),...extra});
const timed=(id,name,dialogue,mode,extra={})=>point(id,name,dialogue,{mode,...extra});
const common=(region,memoryTitle)=>[
 phase('memory',memoryTitle,Array.from({length:3},(_,i)=>point('memory'+i,'Souvenir '+(i+1),'Cette trace retrouve sa place dans le récit. Porte-la avec les deux autres.',{memory:i}))),
 phase('value','La valeur mise en actes',Array.from({length:3},(_,i)=>point('value'+i,'Décision '+(i+1),'Le Gardien interroge les conséquences de tes actes.',{value:i}))),
 phase('guardian','La confrontation', [point('guardian','Libérer le Gardien','Lis ses trois phases, défends le lieu et ouvre une vraie fenêtre.',{guardian:true})]),
 phase('homecoming','Le retour à la Cité',[point('homecoming','Réunir les héritages','Le fragment revient au Cercle. Ce que tu as réparé transforme la Cité.',{homecoming:true})]),
];

export const CAMPAIGN_RUNTIME_SPEC=Object.freeze({
 france:[
  phase('rumor','Les noms effacés',[
   point('relieuse','Léa · la page absente','Je me souviens d’un nom. Le registre affirme qu’il n’a jamais existé.',{grant:'temoignage_lea'}),
   point('temoin','Le témoin du quai','J’ai porté cette page avant sa disparition. Compare mon récit au registre.',{grant:'temoignage_quai'}),
   decision('confronter','Confronter les récits','Deux versions ne suffisent pas à condamner quelqu’un. Quelle trace manque ?', 'archive',[['archive','Chercher le registre original'],['accuser','Accuser le premier témoin']],{requires:['temoignage_lea','temoignage_quai']}),
  ]),
  phase('evidence','Les voix effacées',[
   point('archive','Le sceau du registre','La date est intacte sous l’encre récente.',{grant:'date_originale'}),
   point('atelier','La page cousue','La couture relie cette page au livre de Léa.',{grant:'couture'}),
   decision('preuve','La preuve vérifiable','La date et la couture établissent la même origine.', 'rapprocher',[['rapprocher','Relier les deux traces'],['rumeur','Remplacer la preuve par la rumeur']],{requires:['date_originale','couture'],effect:'archives_ouvertes'}),
  ]),
  phase('coordination','Les deux plateaux',[
   timed('relais','Le plateau du compagnon','Place ton compagnon en garde au premier plateau. Rejoins le second pendant que le lien tient.','relay',{requiresCompanion:true}),
   decision('reparer','Une réparation juste','Le passage est ouvert. À qui rends-tu la page ?', 'rendre',[['rendre','Rendre la page à sa relieuse'],['garder','Garder le mérite et la page']],{effect:'noms_retablis'}),
  ]),...common('france','Ce qui nous relie'),
  phase('post','Les dossiers revenus',[
   point('nouveau','Le dossier du retour','Une autre page porte une correction récente.',{grant:'correction'}),
   point('contradictoire','Le témoin retrouvé','Cette correction protège un innocent, mais efface l’erreur du greffier.',{grant:'aveu'}),
   decision('mediation','La médiation','Réparer exige de reconnaître le tort sans inventer un coupable.', 'assumer',[['assumer','Consigner l’aveu et restaurer le nom'],['effacer','Effacer aussi l’aveu']],{requires:['correction','aveu'],effect:'dossier_resolu'}),
  ]),
 ],
 algerie:[
  phase('rumor','Les liens sous suspicion',[
   point('amel','Amel · le convoi séparé','La caravane accuse celui qui marche le plus lentement.',{grant:'rumeur_convoi'}),
   decision('ecouter','La famille restée derrière','Notre réserve a été donnée à un voyageur malade.', 'entendre',[['entendre','Entendre chacun avant de partir'],['exclure','Écarter les plus lents']],{effect:'groupe_reuni'}),
  ]),
  phase('escort','Ceux qui restent',[
   timed('caravane','La caravane des trois voix','Reste à huit pas du groupe. S’il est laissé derrière, sa confiance baisse. Attends les plus lents.','escort'),
   point('abri','L’abri partagé','Personne n’a été obligé de marcher seul.',{grant:'confiance',effect:'route_sure'}),
  ]),
  phase('truth','La parole difficile',[
   point('reserve','La réserve ouverte','Le registre montre que le chef a caché son propre détour.',{grant:'registre_convoi'}),
   decision('dire','Dire ce qui coûte','La vérité peut te faire perdre une faveur. Le groupe a pourtant besoin de savoir.', 'dire',[['dire','Révéler le détour, y compris ma part'],['cacher','Garder la faveur en cachant le registre']],{requires:['registre_convoi'],consume:['confiance'],effect:'verite_partagee'}),
   timed('rester','Ne pas abandonner','Accompagne ceux que cette vérité a blessés jusqu’à la source.','escort'),
  ]),...common('algerie','L’eau se souvient'),
  phase('post','Les routes de confiance',[
   timed('convoi','Le convoi du retour','Le groupe traverse une autre route. Reste présent sans décider à sa place.','escort',{routeVariant:1}),
   decision('liberte','Le choix du groupe','Une voyageuse veut continuer jusqu’à son village.', 'accompagner',[['accompagner','L’accompagner jusqu’au relais'],['enfermer','L’empêcher de partir']],{effect:'relais_confiance'}),
  ]),
 ],
 maroc:[
  phase('rumor','Le prix du geste',[
   point('yanis','Yanis · l’atelier silencieux','Un mécène promet des outils si mon nom disparaît de l’ouvrage.',{grant:'nom_artisan'}),
   decision('dignite','Le prix de l’aide','L’ouvrage peut être sauvé sans effacer celui qui l’a créé.', 'respecter',[['respecter','Préserver la signature de l’artisan'],['acheter','Exiger sa signature en échange']],{effect:'signature_preservee'}),
  ]),
  phase('craft','Le souffle des cimes',[
   point('metal','Le métal de la cloche','Récupère une pièce réutilisable plutôt que briser l’ouvrage.',{grant:'metal'}),
   point('ruban','Le ruban voyageur','Le ruban porte les noms des trois villages.',{grant:'ruban'}),
   decision('accorder','Accorder les trois cloches','Les poids doivent monter : un, deux, puis trois.', '123',[['123','Accorder 1 · 2 · 3'],['321','Accorder 3 · 2 · 1']],{requires:['metal','ruban'],consume:['metal','ruban'],grant:'cloche_reparee',effect:'cloches_reparees'}),
  ]),
  phase('aid','Donner sans écraser',[
   point('livraison','L’ouvrage partagé','Porte la cloche à l’atelier voisin.',{requires:['cloche_reparee']}),
   decision('donner','Une aide sans dette','L’artisane refuse une dette qu’elle ne pourrait rembourser.', 'partager',[['partager','Donner et laisser son atelier autonome'],['dette','Exiger une dette publique']],{consume:['cloche_reparee'],grant:'outil_transmis',effect:'atelier_autonome'}),
   timed('proteger','Protéger la transmission','Tiens la garde près de l’ouvrage pendant trois coups annoncés.','defend'),
  ]),...common('maroc','Les ateliers de mémoire'),
  phase('post','L’ouvrage transmis',[
   point('fragment','Le fragment de l’apprenti','Récupère la pièce perdue de son premier ouvrage.',{grant:'piece_apprenti'}),
   decision('restaurer','La restauration de l’apprenti','Répare avec lui et laisse sa signature visible.', 'transmettre',[['transmettre','Laisser l’apprenti achever et signer'],['remplacer','Refaire l’ouvrage à sa place']],{consume:['piece_apprenti'],effect:'ouvrage_transmis'}),
  ]),
 ],
 tunisie:[
  phase('rumor','Quand la peur arrive',[
   point('nour','Nour · le signal du large','Il reste quelqu’un sur les marches. La mer ferme le passage par cycles.',{grant:'signal_rivage'}),
   point('corde','Préparer l’issue','Une corde permet le retour. Courage ne veut pas dire absence de préparation.',{grant:'corde',effect:'issue_preparee'}),
  ]),
  phase('rescue','Ce que la mer rend',[
   timed('traverser','La première traversée','Observe la vague ; la bande sûre arrive entre les secondes 0,6 et 1,4 de chaque cycle de trois secondes.','hazard',{requires:['corde']}),
   timed('sauver','La personne du rivage','Reste auprès d’elle pendant le retour ; courir seul ne la ramène pas.','escort'),
   point('retour','Le retour au rivage','La corde a servi ; le passage peut être réouvert.',{consume:['corde'],effect:'personne_sauvee'}),
  ]),
  phase('hazard','La route sous la tempête',[
   timed('marche1','La marche immergée','Chaque marche possède son propre cycle. Observe puis avance.','hazard'),
   timed('marche2','Le passage des rafales','L’issue est devant toi ; conserve assez d’intégrité pour revenir.','hazard',{period:36,window:[12,20]}),
   timed('marche3','Le dernier passage','Un dernier cycle, plus court : de 0,5 à 1,1 seconde sur 2,4.','hazard',{period:24,window:[5,11],effect:'route_ouverte'}),
  ]),...common('tunisie','Les marches retrouvées'),
  phase('post','Les appels du large',[
   timed('appel','Le nouvel appel','Cette fois le passage sûr arrive plus tard. La vieille habitude ne suffit pas.','hazard',{period:40,window:[18,26]}),
   timed('ramener','Ramener la personne','L’issue existe ; elle n’est achevée que lorsque la personne revient.','escort',{routeVariant:1,effect:'second_sauvetage'}),
  ]),
 ],
 espagne:[
  phase('rumor','La place s’échauffe',[
   point('public','Les voix de la Plaza','La foule réclame un geste plus fort que le précédent.',{grant:'rythme_public'}),
   decision('respirer','Faire une place au rythme','Tu peux garder l’énergie sans laisser la foule choisir pour toi.', 'canaliser',[['canaliser','Canaliser l’élan vers une création'],['surchauffer','Pousser tout le monde jusqu’à l’épuisement']],{effect:'public_ecoute'}),
  ]),
  phase('movement','La dernière rotation',[
   timed('moulin','Le mouvement du moulin','Relie les quatre repères dans l’ordre pendant que le rythme reste ouvert.','route',{routeVariant:2}),
   decision('accord','Accorder le vent','Le rythme ne reste vivant que s’il possède une respiration.', 'pause',[['pause','Garder une respiration entre deux élans'],['forcer','Tourner toujours plus vite']],{effect:'moulins_accordes'}),
  ]),
  phase('arena','Le geste juste',[
   timed('enchaîner','L’arène de la Plaza','Frappe sur le temps clair, garde pour respirer, puis répète : frappe · garde · frappe · garde · frappe.','rhythm'),
  ]),...common('espagne','Le phare du crépuscule'),
  phase('post','Les nuits de la Plaza',[
   timed('performance','La création devant la foule','Le rythme du retour change. Trois frappes maîtrisées, deux respirations.','rhythm',{period:16,window:[6,11],effect:'plaza_vivante'}),
  ]),
 ],
 italie:[
  phase('rumor','Ce qui ne revient pas',[
   point('elio','Elio · la terrasse perdue','Ce pont ne reviendra pas à l’identique. Ses pierres peuvent ouvrir une autre voie.',{grant:'pierres_anciennes'}),
   decision('accepter','Reconnaître la perte','L’espoir commence lorsque l’on cesse de promettre ce qui est impossible.', 'autrement',[['autrement','Construire une autre voie'],['copier','Promettre de refaire exactement le passé']],{effect:'perte_reconnue'}),
  ]),
  phase('path','Les jardins suspendus',[
   timed('chemin','Le chemin des terrasses','Rejoins quatre terrasses sûres dans l’ordre. Les anciens accès restent fermés.','route'),
   point('semences','Les semences conservées','Ce qui a survécu peut nourrir le nouveau jardin.',{grant:'semences'}),
  ]),
  phase('rebuild','Reprendre autrement',[
   decision('plan','Le nouveau chantier','Les pierres sauvées servent un nouveau plan, avec une place pour les habitants.', 'jardin',[['jardin','Ouvrir un jardin public'],['atelier','Créer un atelier partagé'],['copier','Forcer le plan du pont effondré']],{answers:['jardin','atelier'],consume:['pierres_anciennes'],grant:'plan_nouveau'}),
   timed('chantier','Le chantier des terrasses','Répare trois assemblages. Le second échoue : observe la nouvelle solution avant de reprendre.','rebuild',{requires:['plan_nouveau','semences'],consume:['plan_nouveau','semences'],effect:'jardin_reconstruit'}),
  ]),...common('italie','La serre des vérités'),
  phase('post','Les chantiers impossibles',[
   timed('nouveau','Le chantier du retour','Le premier plan a changé. Reprends le mécanisme avec ses nouvelles contraintes.','rebuild',{routeVariant:1,effect:'chantier_partage'}),
  ]),
 ],
 turquie:[
  phase('rumor','Les cartes incomplètes',[
   point('deniz','Deniz · la carte trouée','Deux repères restent fiables : l’arche gravée, puis le pont des deux rives.',{grant:'arche_pont'}),
   decision('doute','Agir sans tout savoir','Aucune carte complète n’est disponible. Quelle promesse peux-tu tenir ?', 'coherence',[['coherence','Suivre les repères vérifiables'],['hasard','Choisir au hasard en prétendant savoir']],{effect:'repere_conserve'}),
  ]),
  phase('signals','Le ciel partagé',[
   decision('nord','Le premier astrolabe','La lentille montre le nord.', 'nord',[['nord','Pointer au nord'],['sud','Pointer au sud']],{grant:'etoile_nord'}),
   decision('est','Le deuxième astrolabe','La lentille montre l’est.', 'est',[['est','Pointer à l’est'],['ouest','Pointer à l’ouest']],{grant:'etoile_est'}),
   decision('sud','Le troisième astrolabe','La lentille montre le sud.', 'sud',[['sud','Pointer au sud'],['nord','Pointer au nord']],{requires:['etoile_nord','etoile_est'],effect:'ciel_aligne'}),
  ]),
  phase('commit','La parole sans témoin',[
   point('promesse','Une parole non surveillée','Personne ne te suivra. Porte cette lentille au relais que tu as promis.',{grant:'lentille_confiee'}),
   timed('tenir','Les repères incomplets','L’arche, le pont, puis le relais. La quatrième balise est absente ; garde le cap appris.','route',{requires:['arche_pont','lentille_confiee'],routeVariant:3}),
   decision('rendre','Rendre ce qui a été confié','Une route plus courte offrait une récompense personnelle.', 'rendre',[['rendre','Rendre la lentille au relais promis'],['garder','Garder la lentille pour soi']],{consume:['lentille_confiee'],effect:'parole_tenue'}),
  ]),...common('turquie','La galerie des étoiles'),
  phase('post','Les passages sans carte',[
   timed('nuit','La route nocturne','Les repères tournent. Observe leurs signes plutôt que la position d’hier.','route',{routeVariant:1}),
   decision('cap','Le relais invisible','L’absence d’un témoin ne change pas ta parole.', 'tenir',[['tenir','Achever l’engagement'],['apparence','S’arrêter dès que personne ne regarde']],{effect:'route_nocturne_ouverte'}),
  ]),
 ],
 estonie:[
  phase('rumor','Trop de signaux',[
   point('mira','Mira · le motif sous le bruit','La vraie trace porte deux entailles et revient à intervalles réguliers.',{grant:'deux_entailles'}),
   decision('motif','Comparer avant de suivre','La lueur la plus forte n’est pas forcément la plus fiable.', 'motif',[['motif','Suivre les deux entailles répétées'],['eclat','Suivre l’éclat le plus intense']],{effect:'motif_identifie'}),
  ]),
  phase('tracking','La piste des aurores',[
   timed('piste','Les traces régulières','Rejoins les quatre marques à deux entailles dans l’ordre.','route',{requires:['deux_entailles'],routeVariant:2}),
   point('refuge','Le signe du refuge','Une marque authentique porte aussi le bois du refuge.',{grant:'bois_refuge'}),
  ]),
  phase('decoy','Le faux sentier',[
   decision('leurre','La bifurcation des leurres','Trois lueurs : une entaille, deux entailles, puis aucune.', 'deux',[['une','La première lueur'],['deux','La marque à deux entailles'],['aucune','La lumière sans marque']],{requires:['deux_entailles','bois_refuge']}),
   timed('attendre','La vraie fenêtre','Le vrai signe apparaît entre 1,2 et 2 secondes sur un cycle de 3,6. Attends, puis relève la trace.','hazard',{period:36,window:[12,20],effect:'leurre_ecarte'}),
  ]),...common('estonie','Le refuge des pins'),
  phase('post','Les anomalies boréales',[
   point('anomalie','Une anomalie différente','Le nouveau signe possède trois entailles, répétées à deux endroits.',{grant:'trois_entailles'}),
   decision('relier','La répétition vérifiée','Une seule ancienne entaille est copiée par les leurres.', 'trois',[['deux','Suivre l’ancien motif sans vérifier'],['trois','Relier les trois entailles vérifiées']],{requires:['trois_entailles']}),
   timed('mesurer','L’instant de l’anomalie','Le nouveau cycle est plus lent : 1,8 à 2,6 secondes sur quatre.','hazard',{period:40,window:[18,26],effect:'anomalie_comprise'}),
  ]),
 ],
});

export const campaignTokenIds=region=>[...new Set((CAMPAIGN_RUNTIME_SPEC[region]||[]).flatMap(p=>p.steps.flatMap(s=>[s.grant,...(s.requires||[]),...(s.consume||[])])).filter(Boolean))];
export const campaignEffectIds=region=>(CAMPAIGN_RUNTIME_SPEC[region]||[]).flatMap(p=>p.steps.map(s=>s.effect).filter(Boolean));
export const campaignPhaseIds=region=>(CAMPAIGN_RUNTIME_SPEC[region]||[]).map(p=>p.id);
export function validateCampaignRuntimeSpec(){
 const rows=Object.entries(CAMPAIGN_RUNTIME_SPEC);if(rows.length!==8)throw Error('Huit campagnes requises.');
 for(const [region,phases] of rows){if(phases.length!==8)throw Error('Huit phases requises : '+region);const ids=new Set();for(const p of phases){if(ids.has(p.id)||!p.steps.length)throw Error('Phase invalide : '+region);ids.add(p.id);for(const s of p.steps)if(!s.id||!s.name||!s.dialogue)throw Error('Objectif incomplet : '+region);}}
 return true;
}
