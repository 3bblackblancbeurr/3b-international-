# 3B Token Prototype — T3B

Prototype technique ERC-20 à offre fixe, compilé et testé dans une EVM en mémoire. **Aucune crypto n’a été lancée, enregistrée ou mise en circulation sur un réseau public.** Aucun portefeuille, clé privée, compte bancaire, RPC externe, frais ou paiement n’est utilisé par les tests.

## Contrat fourni

`contracts/ThreeBTokenPrototype.sol` hérite uniquement du contrat standard `ERC20` d’OpenZeppelin.

- Nom : **3B Token Prototype** ; symbole : **T3B**.
- Constructeur : `initialRecipient` et `supplyBaseUnits` sont des paramètres. Il n’existe aucune adresse de bénéficiaire ni offre commerciale codée en dur.
- L’offre est créée une seule fois dans le constructeur, intégralement pour le destinataire fourni, par `_mint`.
- Décimales standard OpenZeppelin : **18**. Le constructeur accepte directement les **unités de base**, sans multiplication. Un argument de `1` représente une unité de base, soit `0,000000000000000001 T3B` en affichage à 18 décimales. Aucune valeur de marché n’est associée.
- Le simulateur financier de l’application utilise **2 décimales** pour ses montants fictifs. Ce contrat ERC-20 utilise **18 décimales** : leurs unités ne sont pas interchangeables et aucune conversion automatique n’est fournie.
- Le destinataire zéro est refusé par OpenZeppelin. Comme le standard le permet, une offre nulle est acceptée ; les tests couvrent aussi cette limite. Le choix d’une offre réelle reste à décider.
- Aucune fonction d’administration, création supplémentaire, destruction publique, mise à niveau, taxe ou pause. Aucun propriétaire privilégié, blacklist ou proxy.
- Les fonctions publiques sont les neuf fonctions ERC-20 et métadonnées habituelles : `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `allowance`, `approve`, `transferFrom`.

Les adresses et quantités des tests sont des fixtures locales arbitraires. Elles ne constituent pas une répartition de tokens, une offre finale ou des portefeuilles à utiliser.

## Versions et reproduction

Versions directes exactes : OpenZeppelin Contracts **5.6.1**, Solidity/solc **0.8.37**, EthereumJS VM/Common/Util **10.1.3**, ethers **6.17.0**. `package-lock.json` verrouille également les dépendances transitives et leurs empreintes d’intégrité. Node utilisé pour la preuve : **24.21.0** ; le projet exige Node ≥ 22.

Le compilateur est fixé dans le pragma, l’optimiseur à 200 passages, `viaIR=false` et la cible EVM à **Cancun**. Ce choix est un réglage de compilation et de test local, pas le choix d’un réseau de lancement. Aucune fonctionnalité expérimentale du compilateur n’est utilisée.

Dans ce dossier :

```powershell
npm ci --ignore-scripts
npm run verify
```

L’installation initiale télécharge les paquets depuis le registre npm. Ensuite `npm run verify` compile et exécute les tests **sans réseau**. Les chemins `fetch`, HTTP(S) et connexion TCP sont bloqués dans la suite de tests. L’EVM reçoit des appels de messages en mémoire : elle ne signe pas de transactions et n’ouvre aucun serveur RPC.

Une surcharge verrouillée de **tmp 0.2.7** corrige une dépendance transitive du paquet de développement solc 0.8.37 ; elle ne change pas le code Solidity ni son bytecode. Le contrôle npm conservé dans `build/dependency-audit.json` indique zéro vulnérabilité connue au moment de sa capture. Ce résultat reste un contrôle de dépendances, pas un audit de sécurité du contrat.

## Preuves livrées

- `build/ThreeBTokenPrototype.json` : ABI, bytecode de création, bytecode d’exécution, identifiants des méthodes et métadonnées du compilateur.
- `build/standard-input.json` : entrée Solidity Standard JSON complète, y compris les sources OpenZeppelin utilisées ; aucune résolution d’import distante n’est nécessaire pour cette entrée.
- `build/compilation-report.json` : version exacte, réglages, tailles, diagnostics et empreintes SHA-256 du contrat, du lockfile et de l’artefact.
- `build/compilation.log`, `build/tests.tap`, `build/verification-report.json` : compilation et résultat des **18 tests locaux (12 ERC-20 EVM et 6 de préparation)**.
- `build/dependency-audit.json` : état npm des dépendances au moment de l’intervention.

La compilation réussit sans avertissement. Le bytecode d’exécution mesure **1 764 octets**. Voir aussi [PREPARATION.md](PREPARATION.md) pour l’atelier, les manifests et le CLI hors ligne.

Les tests vérifient les métadonnées, le destinataire et les unités exactes, les événements, les transferts sans taxe, les autorisations, les rejets de solde/autorisation insuffisants, le destinataire zéro, les offres nulle et uint256 maximale, l’absence de fonctions privilégiées et la conservation de l’offre dans une séquence de transferts.

## Limites et décisions avant tout réseau réel

Les sources, artefacts et validateurs sont partagés avec l’atelier de préparation de l’application 3B. Aucun portefeuille, RPC, point de fidélité ou solde du laboratoire n’est raccordé au contrat. Les soldes du laboratoire et ce contrat sont deux dispositifs distincts. Aucun pont de conversion n’existe.

Avant d’envisager un réseau, il reste à décider explicitement : finalité et droits associés au token, existence ou non d’un usage transférable, offre et répartition, adresse de réception réellement contrôlée, garde des accès, réseau et paramètres compatibles, conditions d’utilisation et obligations applicables. Le nom et le symbole de prototype ne confèrent aucun droit, reconnaissance officielle ou valeur.

Il faut ensuite réexaminer la conception et le compilateur retenu, effectuer une revue de sécurité indépendante adaptée à l’usage, vérifier les dépendances, étendre les tests d’intégration et les essais sur un environnement de recette choisi, préparer le suivi d’incident et approuver séparément tout déploiement. Le caractère fixe et sans administration signifie notamment qu’une erreur de destinataire ou d’offre ne peut pas être corrigée par une fonction de ce contrat. Les coûts de gas des appels EVM locaux ne sont pas une estimation de frais d’un futur réseau.

Il n’existe ici aucun script de déploiement public, aucune configuration RPC et aucun secret. Le financement, la commercialisation, la cotation, la liquidité, la fiscalité et la conformité ne sont ni décidés ni établis par ce prototype.

## Sources officielles consultées le 17 octobre 2026

- [OpenZeppelin — création d’une offre ERC-20 fixe](https://docs.openzeppelin.com/contracts/5.x/erc20-supply) : mécanisme `_mint` limité au constructeur.
- [OpenZeppelin — API ERC-20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20) : fonctions standard, erreurs, événements et décimales.
- [OpenZeppelin Contracts — version 5.6.1](https://github.com/OpenZeppelin/openzeppelin-contracts/releases/tag/v5.6.1).
- [Solidity — annonce officielle 0.8.37](https://www.soliditylang.org/blog/2026/09/10/solidity-0.8.37-release-announcement/) : version stable utilisée et corrections du compilateur.
- [EthereumJS EVM — documentation du projet](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/evm) : exécution locale `runCall` ; documentation du paquet épinglé également consultée dans `node_modules`.
- [Avis de sécurité tmp et correctif 0.2.7](https://github.com/advisories/GHSA-7c78-jf6q-g5cm).

Les sources du contrat sont sous licence MIT ; les licences des dépendances restent applicables. La licence OpenZeppelin est conservée dans `licenses/` et les sources incluses dans l’entrée de compilation conservent leurs notices.
