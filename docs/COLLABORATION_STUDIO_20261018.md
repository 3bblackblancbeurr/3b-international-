# Ateliers d’initiatives, collaborations et candidatures — 18 octobre 2026

## Intégration

Composant : `src/member/collaboration/CollaborationStudio.jsx`.

```jsx
const CollaborationStudio = React.lazy(() => import('./collaboration/CollaborationStudio.jsx'));

<React.Suspense fallback={<p role="status">Ouverture de ton atelier…</p>}>
  <CollaborationStudio space={active} ownerId={profile?.user_id || ''}/>
</React.Suspense>
```

`space` accepte `association`, `partners` ou `join`. Les trois variantes partagent le modèle et la sauvegarde, avec des titres, domaines, pistes, libellés de brief et checklists distincts. `ownerId` sépare les sauvegardes locales des comptes ; l’absence de compte utilise l’espace invité de ce navigateur. L’identifiant ne constitue pas une authentification de sécurité : les données locales restent lisibles par la personne qui contrôle l’appareil.

Les liens existants vers les organismes officiels et la présentation 3B peuvent rester autour de l’atelier. Le dossier local ne confirme aucun statut associatif, partenariat, recrutement ou emploi.

## Parcours disponibles

1. Choisir l’une des trois pistes de la rubrique ou créer un brouillon libre.
2. Renseigner le besoin ou la motivation, le format concret, son public, ses apports, les attentes, le lieu et les disponibilités. Les références et les coordonnées restent du texte local.
3. Relire les sept repères du brief et les quatre points de checklist. Les modifications se sauvegardent automatiquement dans ce navigateur. Le statut de sauvegarde devient explicite en cas d’échec.
4. Copier le brief, exporter le dossier texte/JSON ou préparer un mail à l’adresse 3B déjà définie dans `memberSources.js`. Le lien mail ne s’ouvre qu’après préparation du brief. Un message long propose une copie et un mail à compléter afin d’éviter un corps tronqué par le logiciel de messagerie.
5. Déclarer soi-même le suivi, saisir une prochaine action/date et des notes chronologiques. Une date de suivi ne crée aucun rappel externe. L’ouverture du mail, la copie et l’export ne changent jamais le statut en « envoyé ».
6. Exporter les trois ateliers dans une sauvegarde JSON et les importer avec aperçu de fusion. Une version plus ancienne ne remplace pas une version plus récente et les dossiers absents du fichier sont conservés. La fusion est recalculée à sa validation pour préserver les changements récents.

## Données et limites

- Aucune API d’envoi, aucun téléversement de CV, aucun formulaire serveur et aucune création de partenaire ou d’emploi.
- Le message destiné au mail inclut le brief et les coordonnées choisies. Les notes de suivi internes, le statut et les prochaines actions restent exclus du corps du mail.
- Les dossiers texte complets et les sauvegardes JSON incluent les notes locales ; l’utilisateur choisit de les télécharger. Leur contenu est en clair.
- Jusqu’à 60 dossiers ; les notes sont limitées aux 30 plus récentes par dossier. Les champs et les imports sont bornés. Une sauvegarde corrompue est conservée dans une clé `:recovery` avant remplacement.
- Le stockage ne synchronise pas plusieurs appareils ou plusieurs personnes ; l’export/import réalise un transfert volontaire. Aucune collaboration en temps réel n’est annoncée.
- La suppression est locale et précédée d’une confirmation explicite dans l’interface. Une sauvegarde permet de conserver une copie avant suppression.

## Recette ciblée

- Créer un dossier dans chaque rubrique, saisir une phrase contenant des espaces, fermer et rouvrir le brief ; recharger pour confirmer la persistance.
- Marquer prêt après avoir complété les repères et la checklist, puis retirer un champ requis : le dossier redevient brouillon.
- Noter une action et une date tout en modifiant le brief ; vérifier que le suivi n’est pas écrasé par l’édition du brief.
- Copier/exporter le message et vérifier que les notes internes en sont absentes. Ouvrir le lien de messagerie : le suivi demeure déclaré localement, sans envoi confirmé.
- Importer une sauvegarde ancienne et vérifier la conservation des versions récentes et des autres rubriques.
- Simuler un stockage bloqué et vérifier le message invitant à exporter, sans affichage d’une sauvegarde réussie.
- Vérifier les trois variantes sur petit écran et au clavier ; les contrôles de l’atelier utilisent les boutons partagés et les tokens Gold Master.

Vérifié : 16 tests de l’atelier et 12 tests Gold Master réussis ; transformation JSX sans avertissement. Commande ciblée : `node --test tests/collaboration-studio.test.js tests/gold-master-design-system.test.js`. La création et la sélection d’un dossier le font apparaître à l’écran ; le défilement respecte la préférence de réduction des mouvements.
