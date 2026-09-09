# Ajouter mes vêtements dans la boutique 3B

La version préparée reste vide jusqu’à l’ajout de tes véritables articles. Elle affiche « Collection en préparation ». Aucun vêtement ou prix de la maquette n’a été ajouté au site.

**Avant la première utilisation :** la version doit être installée sur ton projet Vercel et la connexion Stripe, la base des commandes ainsi que les conditions de vente doivent être configurées. Cette installation n’a pas encore pu être faite avec les accès de la session. Le guide `ACTIVATION-PAIEMENT.md` couvre cette configuration unique.

Une fois cette configuration terminée avec le mode de catalogue `metadata`, tu peux gérer tes vêtements depuis le tableau de bord Stripe, sans modifier le code du site.

## 1. Préparer une fiche de vêtement

Pour chaque combinaison de taille et de couleur vendable, créer un produit dans le catalogue Stripe. Renseigner :

- Son nom complet, avec la taille et la couleur, pour identifier clairement l’article sur la commande.
- Une vraie photo du vêtement et sa description : matière, coupe et détails utiles.
- Son prix ponctuel en euros TTC, par unité, à sélectionner comme prix par défaut du produit.

## 2. Renseigner les informations de la variante

Dans les métadonnées du produit, ajouter les champs suivants. Les valeurs ci-dessous expliquent le format ; elles ne créent aucun vêtement.

| Champ | À renseigner |
|---|---|
| `size` | La taille : par exemple `M` ou `L`. |
| `color` | La couleur : par exemple `Noir`. |
| `shop_group` | Un identifiant commun aux variantes du même modèle. |
| `shop_name` | Le nom commun du modèle, affiché dans la boutique. |
| `shop_visible` | `false` pendant la préparation, puis `true` pour publier. |
| `max_per_order` | Facultatif : de `1` à `5` articles de cette variante par commande. |

Pour un même modèle, garder `shop_group` et `shop_name` identiques sur toutes les variantes. Elles seront réunies dans une fiche avec le choix « Taille et couleur ».

## 3. Publier

Quand la photo, la description, le prix et la variante sont prêts, passer `shop_visible` à `true`, enregistrer, puis recharger la boutique. L’article apparaît sans nouvelle installation du site.

## Modifier ou retirer un vêtement

Les modifications de photo, de nom et de description sont récupérées au chargement suivant. Pour changer un montant, créer un nouveau prix dans Stripe et le choisir comme prix par défaut. Un panier contenant l’ancien prix devra être actualisé avant un nouveau paiement.

Pour masquer un article, passer `shop_visible` à `false` ou archiver son produit. Il disparaît au prochain chargement et le serveur refuse de créer un nouveau paiement pour cette référence. Cette action n’annule pas les paiements déjà ouverts.

**Stock :** la limite par commande ne suit pas les quantités restantes. La réservation et la diminution automatiques des stocks restent à développer avant la vente de séries limitées.

La gestion du catalogue décrite s’appuie sur les [produits et prix Stripe](https://docs.stripe.com/products-prices/manage-prices) et leurs [métadonnées](https://docs.stripe.com/metadata). Le champ `shop_visible` pilote uniquement la publication dans cette intégration 3B.
