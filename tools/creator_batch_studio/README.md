# Creator Batch Studio v1.0

Premier produit Windows du **3B Creator Money Engine**.

## Ce que fait la v1

- traite un fichier, plusieurs fichiers ou un dossier complet ;
- redresse automatiquement les images selon leur EXIF ;
- exporte en **WebP, JPG ou PNG** ;
- règle la qualité de compression ;
- renomme proprement les fichiers avec préfixe et compteur ;
- produit plusieurs formats en un seul passage :
  - original ;
  - Instagram 1080×1080 ;
  - TikTok / Reels 1080×1920 ;
  - YouTube 1280×720 ;
  - Web max 1600 px ;
- ne recadre pas les visuels sociaux : l'image est centrée dans le cadre ;
- génère un rapport local `creator_batch_report.json` ;
- fonctionne entièrement en local, sans upload Internet.

## Interface Windows

Lancer `CreatorBatchStudio.exe`, choisir les images ou un dossier, choisir le dossier de sortie, cocher les formats puis cliquer sur **Créer les exports**.

## Ligne de commande

```powershell
CreatorBatchStudio.exe --input "C:\Visuels" --output "C:\Exports" --format webp --quality 88 --preset instagram_square --preset tiktok_story
```

## Développement

```powershell
python -m pip install -r tools/creator_batch_studio/requirements.txt
python -m unittest discover -s tools/creator_batch_studio/tests -v
python tools/creator_batch_studio/creator_batch_studio.py
```

## Build Windows

Le workflow GitHub Actions **Creator Batch Studio Windows** exécute les tests, fabrique `CreatorBatchStudio.exe`, smoke-teste l'exécutable, crée un ZIP de distribution et un checksum SHA-256.

Le ZIP commercial contient également :
- `QUICK_START.md` ;
- `FAQ.md` ;
- `LICENSE.txt` pour Creator Batch Studio ;
- `Pillow-LICENSE.txt` avec la notice de licence du composant Pillow embarqué.

Aucune clé API, aucun compte externe et aucun accès réseau n'est requis par l'application.
