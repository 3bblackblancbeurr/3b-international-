const LINES={
 ines_varga:['Les Archives n’oublient rien. Elles attendent seulement qu’on sache écouter.','Un souvenir brisé n’est pas perdu : il faut retrouver son ordre.','Quand tu entendras l’Écho, ne cours pas. Observe ce qu’il essaie de protéger.'],
 mael_rivière:['Bienvenue dans la Cité. Commence par regarder autour de toi avant de choisir une porte.','Le 3B Express relie tous les quartiers. Apprends la ville, elle te servira plus tard.','Les premiers pas paraissent simples, mais ils ouvrent tout le reste.'],
 celine_moreau:['Chaque enregistrement garde une trace de ceux qui l’ont créé.','Trois fragments suffisent parfois à faire revenir une voix entière.','Restaure le message sans le déformer : la mémoire mérite mieux qu’une approximation.'],
 samir_benyahia:['Aux Docks, la mer donne toujours une deuxième route.','Un bateau sans pavillon n’est jamais là par hasard.','Si les lumières du quai s’éteignent, suis le reflet bleu sur l’eau.'],
 lyna_amrane:['Une navette fiable se reconnaît avant la tempête, pas pendant.','J’écoute les moteurs comme d’autres écoutent les gens.','Si une coque revient abîmée, on la répare avant de poser des questions.'],
 nora_khelifi:['Les cartes rares ne montrent pas toujours des lieux. Certaines montrent des moments.','Trois reflets, trois angles, un seul motif.','La pluie révèle des choses que les vitrines cachent quand il fait beau.'],
 hugo_martel:['La mobilité, ce n’est pas aller vite. C’est garder le contrôle.','Utilise les toits, les passerelles et les tyroliennes comme un seul parcours.','Si tu rates un saut, recommence proprement plutôt que de forcer.'],
 sofia_vega:['La passion sans contrôle brûle trop vite.','Dans l’Arène, je regarde comment tu réagis sous pression.','Diego ne cherche pas le plus agressif. Il cherche celui qui reste maître de lui.'],
 leyla_demir:['Un câble silencieux est plus inquiétant qu’un câble bruyant.','Les téléphériques ont leurs propres rythmes. Apprends-les avant d’intervenir.','Répare le pylône, puis observe la ligne entière avant de relancer.'],
 maarja_saar:['Le Jardin parle doucement. C’est pour ça que peu de gens l’entendent.','Quatre sons différents peuvent pointer vers le même signal.','La brume n’efface pas le chemin : elle enlève seulement les distractions.'],
 giulia_ferri:['Huit graines, huit origines, un même jardin.','Certaines plantes ne repoussent que lorsqu’on restaure leur voisinage.','Le conservatoire sera vivant quand chaque espèce aura retrouvé sa place.'],
 omar_el_fassi:['Un motif parfait n’est jamais seulement décoratif.','Le zellige numérique garde la règle : chaque pièce dépend des autres.','Scanne, assemble, puis personnalise. Dans cet ordre.'],
 amira_mansouri:['Une communauté tient parce que les gens se parlent avant de se juger.','Écoute trois versions avant de proposer une solution.','Organiser une rencontre vaut parfois mieux que gagner un débat.'],
 elio_romano:['Ta Ville 3B commence par une fondation claire, pas par dix bâtiments.','Place, relie, sauvegarde. Ensuite seulement tu agrandis.','Une bonne ville laisse de la place à ce que tu n’as pas encore imaginé.'],
 arda_kaya:['Le bleu Matrix indique le chemin du courant. Quand il clignote, quelque chose décroche.','Trois relais alimentent ce secteur. Un seul mauvais ordre peut couper le quartier.','Répare proprement : je préfère dix secondes de plus à une panne de plus.'],
 evelin_tamm:['Le loup-signal n’est pas un trophée. C’est un être à protéger.','Les traces deviennent plus nettes quand on ralentit.','Si tu le trouves, ne l’encercle pas. Laisse-lui une sortie.'],
 youssef_ben_salem:['Le sauvetage commence avant de monter dans le bateau.','Équipement, météo, équipage : vérifie les trois.','On rentre tous ensemble ou la mission n’est pas terminée.'],
 lucia_navaro:['Une place vide peut devenir un événement en quelques minutes.','Je veux des gens qui participent, pas seulement des spectateurs.','Les meilleures scènes commencent quand le quartier oublie qu’il regarde une scène.'],
 meryem_alaoui:['Une fibre intelligente doit rester belle quand la technologie se tait.','Le bleu Matrix est instable sur ce matériau. Aide-moi à le fixer.','La mode du 3B doit pouvoir raconter quelque chose avant même qu’on lise le logo.'],
 noah_leroux:['Les fragments ne sont pas huit objets séparés. Ils sont les bords d’un même cercle.','Synchronise les fréquences avant de chercher à ouvrir une porte.','Quand les huit signaux répondront ensemble, la Tour changera.'],
 the_conductor:['Le dernier train ne figure sur aucun horaire.','Le Wagon 8 apparaît seulement à ceux qui savent pourquoi ils montent.','Ne cherche pas la sortie avant d’avoir compris les huit valeurs.'],
 kadra_zerrouki:['Sous l’eau, une carte ne se lit pas comme sur terre.','Trois traces reposent près de l’ancienne archive.','Remonte le souvenir entier. Un fragment seul raconte souvent la mauvaise histoire.'],
 adrian_sol:['Bienvenue dans l’Arène. Ici, le public voit tout.','Un bon défi doit être lisible, difficile et juste.','Quand tu seras prêt, je ferai monter le niveau.'],
 soraya_najem:['Une ville vivante a besoin de témoins, pas seulement de caméras.','Je recueille les voix que les grands écrans oublient.','Si trois habitants disent la même chose de trois façons différentes, écoute le fond.'],
};

export function hubNpcDialogue(item,missionState,turn=0){
 const base=LINES[item.npcId]||[`${item.name} observe le quartier.`,item.role||'Le monde continue autour de toi.','Reviens après avoir avancé dans la Cité.'];
 const missionId=item.missionIds?.[0],state=missionId?missionState?.[missionId]:null;
 const contextual=state?.claimed?'Tu as tenu ta parole. La Cité s’en souviendra.':state?.status==='completed'?'Tu as terminé. Récupère ta récompense avant de repartir.':state?.status==='active'?`Continue la mission : objectif ${Math.min(state.completedObjectives+1,state.totalObjectives)} sur ${state.totalObjectives}.`:missionId?'J’ai une mission pour toi quand tu seras prêt.':null;
 const lines=contextual?[base[0],contextual,...base.slice(1)]:base;
 return lines[Math.abs(turn)%lines.length];
}
