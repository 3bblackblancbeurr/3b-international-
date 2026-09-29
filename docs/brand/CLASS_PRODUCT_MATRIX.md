# 3B — matrice produit/service → classes à protéger

Cette matrice sert à éviter les doublons et à distinguer ce qui relève déjà de 25/35/42 de ce qui nécessite un nouveau dépôt.

| Projet / produit 3B | Classe principale à auditer | Statut |
|---|---:|---|
| vêtements, polos, hoodies, qamis urbain, chaussures | 25 | déjà dans le périmètre initial selon le récapitulatif de dépôt |
| publicité / communication / intermédiation commerciale | 35 | déjà dans le périmètre initial |
| SaaS, développement logiciel, hébergement, cloud | 42 | déjà dans le périmètre initial |
| application téléchargeable 3B | 9 | nouveau dépôt à préparer |
| logiciels Windows 3B / ALBERT distribués au téléchargement | 9 | nouveau dépôt à préparer |
| jeux vidéo téléchargeables | 9 | nouveau dépôt à préparer |
| manga / BD imprimés | 16 | nouveau dépôt à préparer |
| artbooks / livrets imprimés | 16 | nouveau dépôt à préparer |
| sacs / bagagerie 3B | 18 | nouveau dépôt à préparer |
| jeux 3B en ligne | 41 | nouveau dépôt à préparer |
| publication manga numérique non téléchargeable | 41 | nouveau dépôt à préparer |
| vidéos / 3B Origins TV comme contenu de divertissement | 41 | nouveau dépôt à préparer |
| jeux de société, cartes physiques, figurines | 28 | à auditer si commercialisés |
| diffusion/transmission/forum comme service de communication | 38 | à auditer selon architecture réelle |
| véritable service de réseau social en ligne | 45 | à auditer si exploité comme service distinct |

## Règle
Ne pas sélectionner une classe uniquement parce qu'une fonctionnalité existe dans le code. La classe doit correspondre aux produits/services réellement proposés ou sérieusement prévus sous la marque.
