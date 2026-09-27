# 3B Brand Master Vault

Ce dossier initialise le coffre officiel du Gold Master.

## Règle absolue
L’IA peut générer une scène, une ambiance, un décor ou une zone réservée. Elle ne doit jamais redessiner un logo officiel 3B, un drapeau officiel verrouillé ou une identité de pays.

## État actuel
Le dépôt contient des icônes d’application et un visuel Passeport déjà utilisés. Ils sont verrouillés comme assets hérités.
Les neuf logos officiels FR / MA / TN / TR / DZ / ES / IT / EE / 3B International ne sont pas présents sous une forme identifiable et vérifiable dans le dépôt actuel. Le manifeste reste donc volontairement en statut `bootstrap` : aucune fausse version n’est inventée.

## Activation SHA-256
1. Ajouter les vrais fichiers officiels dans `brand/master/logos/`.
2. Renseigner leurs chemins dans `requiredOfficialLogos`.
3. Lancer `npm run brand:lock`.
4. Vérifier les visuels.
5. Passer le manifeste à `status: "enforced"`.
6. La CI refusera ensuite toute modification silencieuse d’un asset verrouillé.
