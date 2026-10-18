# Atelier T3B — préparation reproductible

Le contrat livré est toujours **3B Token Prototype / T3B / 18 décimales**. Le titre modifiable de l’atelier nomme uniquement un dossier. Seuls le destinataire initial et l’offre en unités de base sont des arguments du constructeur. Il n’existe aucune fonction de création ultérieure, administrateur ou mise à niveau.

Le simulateur **3BT démo à 2 décimales** reste un outil séparé : aucun solde, point ou taux de change n’alimente le contrat.

## Reproduire la preuve

Dans ce dossier, avec Node ≥ 22 :

```powershell
npm ci --ignore-scripts
npm run verify
```

Les **18 tests** comprennent les 12 tests ERC-20 EVM initiaux et 6 tests de préparation. Le constructeur du plan est réellement exécuté en mémoire, puis son nom, symbole, précision, offre et solde destinataire sont relus. L’entrée Standard JSON, ABI, bytecode, versions et empreintes sont conservés dans `build/`. Les chemins réseau sont bloqués lors des exécutions EVM. Aucun RPC, portefeuille ou signature n’est configuré.

## Préparer les arguments d’un dossier

Dans l’application : Banque & crypto → Projet token → compléter les paramètres → Manifeste → Exporter le manifeste. `examples/project-draft.json` fournit également un brouillon vide, sans destinataire ni offre implicite.

```powershell
node scripts/prepare-deployment.mjs chemin-vers-mon-projet.json --verify-local --out build/mon-plan.json
```

Le CLI vérifie la quantité exacte, la limite uint256 et l’adresse publique, y compris sa somme de contrôle lorsqu’elle comporte une casse mixte. Il encode le constructeur et associe les empreintes du contrat et de l’artefact. `--verify-local` exécute exclusivement une EVM en mémoire. Le réseau choisi dans le manifeste reste une déclaration de destination envisagée : le CLI ne le contacte jamais.

Le plan contient les arguments encodés et les données de création nécessaires à une revue technique, avec `signed=false`, `broadcast=false`, `rpcConfigured=false` et `publicContractAddress=null`. La vérification compare tous les champs dérivés au plan canonique : arguments, encodage, empreintes, réseau, statut et exécution. Un plan altéré est refusé avant le constructeur. Relancer le CLI depuis le manifeste régénère un plan et sa preuve. Il ne contient pas d’estimation de frais ni de transaction signée. Il ne doit recevoir aucune clé privée, phrase de récupération ou URL RPC contenant un secret.

## États de préparation

- Les paramètres restent incomplets tant que finalité, quantité et destinataire ne sont pas renseignés correctement.
- Un dossier local demande une organisation, deux responsabilités distinctes et une référence sur l’usage et la répartition.
- Une préparation Sepolia demande aussi des références de garde et de revue technique.
- Un dossier Mainnet demande en plus les références de recette testnet, qualification du projet et exploitation.

Une pièce n’est renseignée que si sa référence, son relecteur et une date valide non future sont présents. Ces champs sont déclaratifs ; ils ne prouvent ni audit indépendant, ni contrôle d’adresse, ni conformité. Le statut calculé prépare une revue. Il n’active aucun déploiement public et n’atteste aucun agrément.

Les références et paramètres restent dans le navigateur. Le JSON permet une sauvegarde portable. Son import exige un aperçu puis un remplacement explicite ; les états et quantités dérivées sont recalculés. Les écritures des onglets coopérants sont sérialisées avec Web Locks lorsque disponible ; un contrôle de version précède chaque écriture. Les modifications de champs distincts sont fusionnées. Un conflit ou un échec de sauvegarde conserve le brouillon affiché et exportable, sans annoncer une sauvegarde réussie. Recharge ensuite explicitement la version enregistrée.

## Sources officielles vérifiées le 18 octobre 2026

- [OpenZeppelin — offre ERC-20](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) : `_mint` dans le constructeur pour une offre fixe.
- [Solidity — compilateur et Standard JSON](https://docs.soliditylang.org/en/latest/using-the-compiler.html) : choix explicite de la cible EVM et entrée de compilation.
- [Ethereum — réseaux](https://ethereum.org/developers/docs/networks/) : distinction développement local, testnets et Mainnet ; Sepolia destiné aux applications.
- [Configuration officielle Sepolia](https://github.com/eth-clients/sepolia) : identifiant de chaîne 11155111 et calendrier des évolutions du réseau.
- [EIP-155](https://eips.ethereum.org/EIPS/eip-155) : identifiant Ethereum Mainnet 1.

Avant toute décision de lancement, les responsables devront confronter le dossier à ses pièces, choisir le mode de garde, terminer les revues nécessaires et décider séparément du réseau et du déploiement. L’atelier ne vend aucun token et ne crée aucun droit financier.
