# Kousine — catalogue de recettes

Front React + MUI hébergé sur GitHub Pages. Le catalogue est stocké dans public/data/catalogue.json : aucune base Supabase, aucun compte utilisateur et aucune famille ne sont nécessaires pour utiliser l’app.

## Source Google Sheets

La lecture d’un catalogue Google Sheets est disponible via une application Web Apps Script en lecture seule. Suivre le [guide de configuration Google Sheets](docs/google-sheets-setup.md) : créer un tableur privé, coller `google-apps-script/Code.gs`, exécuter `initialiserKousine` pour importer les recettes, puis déployer l’application Web en accès anonyme. Tester l’URL `/exec` depuis **Catalogue → Source des recettes**.

Pour tous les visiteurs, renseigner cette URL dans `public/data/source.json` et publier la configuration une fois. Les ajouts suivants se font dans Sheets sans modifier GitHub. Tant que cette URL est vide, le site conserve son catalogue JSON. Une panne Google déclenche un secours JSON avec un avertissement ; cette copie de secours n’est pas automatiquement synchronisée.

En mode Sheets, le formulaire de l’app reste un outil de brouillon/export ; il n’écrit pas dans le tableur et la publication GitHub est désactivée. Un autre chat connecté à Google Drive peut modifier les trois onglets avec les droits de ton compte : le guide contient une consigne d’ajout réutilisable.

## Démarrer

Node.js 24 et les dépendances du projet :

```powershell
npm ci
npm run dev:local
```

Ouvrir http://127.0.0.1:4173/#/. Aucun fichier .env n’est nécessaire.

## Catalogue et usage mobile

31 recettes : la recette du backup et **30 recettes originales**, réparties en 6 gâteaux airfryer, 6 compotes, 6 plats simples, 6 petites pâtisseries et 6 salades. Recherche par ingrédients sans accents, cinq catégories, filtre 30 minutes, portions ajustables et ingrédients cochables.

Le mode cuisine présente une étape à la fois avec un minuteur manuel : démarrage, pause, reprise et réinitialisation. Sur tablette, ingrédients et étapes se lisent côte à côte. Les recettes airfryer sont à adapter à l’appareil ; les compotes attendent la référence exacte du Tefal pour fixer le cycle. Les températures et temps proposés n’ont pas été testés en cuisine.

L’analyse et les limites de validation sont détaillées dans [le bilan UX](docs/ux-audit.md).

## Ajouter ou modifier une recette

1. Ouvrir **Catalogue** et activer le mode édition.
2. Utiliser **Ajouter**, ou le bouton d’édition d’une recette.
3. Prévisualiser et confirmer. La recette est enregistrée dans un **brouillon local**, conservé après rechargement sur le même navigateur.
4. Depuis **Catalogue**, exporter le JSON ou publier sur GitHub.

Les favoris et l’historique restent sur cet appareil. Les autres visiteurs ne voient pas les brouillons. Le mode édition permet de préparer des changements localement, sans accorder de droits sur le dépôt. L’effacement des données du navigateur supprime ces brouillons : exporter avant de changer d’appareil ou de nettoyer le navigateur.

## Publier depuis le front

Le dépôt proposé est Heldeee/leocook et la branche main. Créer personnellement un token GitHub à permissions fines, limité à ce dépôt, avec **Contents: Read and write**, et une expiration courte. Il peut nécessiter une approbation selon les règles du dépôt. Le saisir uniquement dans l’écran Catalogue. Aucun token n’est intégré au build, enregistré dans localStorage, ni envoyé dans le catalogue. Il reste dans la mémoire de cet écran et est effacé après une tentative ou lorsqu’on quitte l’écran.

Le bouton **Publier sur GitHub** effectue une lecture et un commit du fichier de catalogue via l’API GitHub. Le SHA du fichier et la version d’origine du brouillon empêchent d’écraser une modification faite ailleurs. En cas de conflit ou de refus, le brouillon reste disponible pour export. Exporter, abandonner le brouillon, puis recharger le site après le dernier déploiement avant de reprendre les modifications.

La publication sur main déclenche .github/workflows/deploy.yml. Configurer GitHub Pages avec **GitHub Actions** comme source de déploiement. Les anciens secrets Supabase ne sont plus utilisés. Les routes utilisent un hash (#/recipes/...) pour fonctionner après rechargement sur GitHub Pages. Si le nom du dépôt change, adapter la base dans vite.config.js.

Alternative sans token dans le navigateur : exporter catalogue.json, remplacer public/data/catalogue.json dans le dépôt, puis committer et pousser avec Git.

**Tout le catalogue publié est public**, y compris les photos intégrées. La publication réelle et les permissions GitHub n’ont pas été testées avec un compte réel ; les requêtes sont simulées dans les tests.

## Photos

Les nouvelles photos JPEG, PNG, WebP ou GIF sont intégrées au JSON, avec une limite de 750 Ko par photo. La publication depuis le front est limitée à 900 Ko pour le catalogue complet. Cela convient à un petit catalogue ; pour davantage de photos, placer des fichiers optimisés dans public/images/ et référencer images/nom.webp dans image_url, puis publier avec Git. Les anciennes URLs Supabase, si présentes dans un autre export, doivent être remplacées : une sauvegarde SQL n’embarque pas les fichiers des buckets.

## Backup importé

Le backup local fourni a permis de récupérer **1 recette**, 8 ingrédients, 9 unités, 4 tags, 1 relation ingrédient, 1 étape et 1 relation tag. Aucune photo n’est référencée. Les identifiants d’auteurs, familles, emails, comptes, sessions et données d’authentification sont exclus du catalogue public. Le dossier backup/ est ignoré par Git et sa sauvegarde originale reste intacte.

Pour convertir un autre dump PostgreSQL texte avec des sections COPY :

```powershell
npm run import:backup -- backup/mon-export.backup.gz public/data/catalogue-import.json
```

Le script accepte du SQL texte, compressé gzip ou non. Il refuse d’écraser un fichier existant. Vérifier le fichier produit avant de remplacer le catalogue actif. Les dumps PostgreSQL binaires ne sont pas pris en charge.

## Vérifier et construire

```powershell
npm test
npm run lint
npm run build
# Avec npm run dev:local lancé dans un autre terminal :
npm run cypress:run
```

Les tests couvrent l’import sans données privées, les relations, la création/édition atomique, la persistance, les favoris, les conflits et erreurs GitHub, ainsi que les parcours navigateur. Les scénarios historiques Supabase restent dans cypress/e2e/ mais sont exclus du scénario actif. Les anciens fichiers SQL sont conservés comme archives ; l’ancien README est dans docs/legacy-supabase.md.

`npm run catalogue:enrich` ajoute les recettes définies dans `scripts/recipes.mjs` sans doublon et sans remplacer une recette déjà présente. Pour modifier une recette existante, utiliser le front ou le JSON actif. Les sauvegardes du catalogue précédent restent dans `backup/`, hors Git.
