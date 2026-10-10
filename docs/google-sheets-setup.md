# Connecter Kousine à Google Sheets

Le front et l’API de lecture sont prêts. Il reste à créer le tableur et à déployer le script dans ton compte Google. Le JSON actuel reste une copie de secours, pas une sauvegarde automatiquement synchronisée.

## 1. Créer le tableur et importer le catalogue

1. Créer un **nouveau Google Sheets vide** nommé `Kousine — Recettes`. Laisser son partage sur **Accès limité**.
2. Depuis ce tableur : **Extensions → Apps Script**.
3. Remplacer le contenu de `Code.gs` par le fichier [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) de ce dépôt. Enregistrer le projet sous `Kousine — Catalogue`.
4. Dans la liste des fonctions en haut, sélectionner **initialiserKousine**, puis **Exécuter**.
5. Autoriser ton propre script à accéder au tableur et à récupérer le catalogue public du site. Aucun mot de passe ou token à copier dans l’app.
6. Revenir au tableur : trois onglets ont été créés et remplis, **Recettes**, **Ingredients**, **Etapes**. Les identifiants de recettes existants sont conservés, donc les favoris continuent de fonctionner.

L’initialisation importe le JSON servi sur `https://heldeee.github.io/leocook/data/catalogue.json`. Elle refuse de remplacer un onglet non vide. Elle n’importe pas d’éventuels brouillons stockés uniquement dans un navigateur : exporte-les séparément avant la migration si tu veux les conserver. Une deuxième exécution après réussite est refusée pour protéger tes données.

## 2. Déployer l’API de lecture

Dans Apps Script :

1. **Déployer → Nouveau déploiement**.
2. Choisir le type **Application Web**.
3. **Exécuter en tant que : Moi**.
4. **Qui a accès : Tout le monde**, y compris les visiteurs non connectés à Google.
5. Cliquer sur **Déployer** et copier **l’URL de l’application Web**, qui se termine par `/exec`.

Le tableur reste privé. L’application Web publie uniquement les champs de catalogue des lignes `published`. Elle ne propose aucune écriture anonyme, aucun `doPost`, aucun accès arbitraire à d’autres fichiers. Ne pas placer de données personnelles dans les recettes publiées.

Tester l’URL `/exec` dans une fenêtre privée : elle doit afficher un objet JSON contenant `version`, `recipes`, `ingredients`, etc., sans page de connexion. Une URL `/dev` n’est pas destinée au front public. Si ton compte Workspace ne permet pas « Tout le monde », le déploiement anonyme peut être bloqué par l’administrateur ; ne rends pas le tableur public pour contourner cela.

Les [applications Web Apps Script](https://developers.google.com/apps-script/guides/web) prennent en charge `doGet` et les droits du propriétaire. Le [Content Service Google](https://developers.google.com/apps-script/guides/content) renvoie le JSON avec une redirection vers `script.googleusercontent.com`, suivie par le navigateur.

## 3. Connecter l’app

1. Dans Kousine, ouvrir **Catalogue → Source des recettes**.
2. Coller l’URL `/exec` dans **URL publique Apps Script**.
3. Cliquer **Tester et connecter Google Sheets**, puis **Recharger l’app**.

Ce test s’applique seulement à cet appareil. Pour connecter **tous les visiteurs**, transmettre l’URL `/exec` dans ce chat : nous la renseignerons dans `public/data/source.json` puis publierons cette configuration une fois.

```json
{
  "googleSheetsUrl": "https://script.google.com/macros/s/TON_DEPLOIEMENT/exec"
}
```

Ne pas inventer cet identifiant : utiliser l’URL fournie par Google. **Ensuite, les changements dans Sheets ne demandent aucun commit ni déploiement.** Le catalogue est relu à chaque rechargement de l’app. Aucun rafraîchissement en direct n’est effectué pendant une session de cuisine.

Si Google ne répond pas, si l’accès n’est pas anonyme, si le navigateur refuse la réponse ou si le catalogue est invalide, le site utilise le JSON de secours et affiche un avertissement. La connexion réelle et les redirections depuis GitHub Pages doivent être vérifiées avec ton URL ; les tests locaux utilisent une API simulée.

## 4. Ajouter ou modifier une recette

### Recettes

Colonnes : `id`, `name`, `category`, `servings`, `description`, `notes`, `prep_minutes`, `cook_minutes`, `image_url`, `tags`, `status`, `created_at`.

- `id` : identifiant unique et stable, par exemple un UUID. Ne jamais changer celui d’une recette existante.
- `category` : `airfryer`, `compotes`, `plats`, `patisseries`, `salades`, ou vide pour Mon carnet.
- `servings` : nombre entier positif.
- `prep_minutes`, `cook_minutes` : nombres positifs ou nuls ; vide si inconnu. Pour un cycle d’appareil variable, laisser `cook_minutes` vide.
- `image_url` : facultatif. Pour une image hébergée ailleurs, utiliser un lien HTTPS réellement accessible au public, pas simplement un lien de partage Google Drive.
- `tags` : séparés par ` | `, par exemple `Goûter | Chocolat`.
- `status` : **draft** pendant la rédaction, puis **published** quand les ingrédients et étapes sont complets.
- `created_at` : date ISO, par exemple `2026-10-10T12:00:00Z` ; facultatif.

### Ingredients

Une ligne par ingrédient : `recipe_id`, `ingredient`, `quantity`, `unit`.

Exemple : `ID_DE_RECETTE` · `farine` · `150` · `g`.

Les quantités sont des nombres, avec point ou virgule décimale, sans texte dans la cellule. Les unités sont séparées : `g`, `ml`, `pc`, `c. à s.`, etc. Ne pas répéter le même ingrédient deux fois pour une recette ; réunir les quantités ou utiliser des noms précisant leur usage.

### Etapes

Une ligne par étape : `recipe_id`, `step_number`, `instruction`, `duration_seconds`.

Les numéros commencent à 1 et se suivent sans trou. Le minuteur est facultatif et **en secondes** : `600` signifie 10 minutes.

### Publication

Pour une nouvelle recette, créer d’abord sa ligne `draft`, puis les ingrédients et étapes avec le même `recipe_id`, enfin passer à `published`. Pour modifier une recette existante, la remettre en `draft` pendant la modification, vérifier le résultat depuis **Kousine → Vérifier les recettes publiées**, puis republier. Elle disparaît temporairement du catalogue tant qu’elle est en brouillon.

Ne pas renommer les onglets ou les en-têtes ; l’ordre des colonnes peut changer. Les colonnes supplémentaires ne sont pas exposées par l’API. Une recette publiée doit avoir au moins un ingrédient et une étape ; des doublons ou des numéros d’étapes incohérents empêchent de servir un catalogue partiellement invalide.

Les brouillons locaux du front restent exportables, mais le formulaire **n’enregistre pas dans Sheets** dans cette première version. Le bouton de publication GitHub est masqué en mode Sheets pour éviter d’écrire dans une source que l’app ne lit plus. Les anciens brouillons incompatibles sont conservés pour export sans masquer le catalogue Sheets à jour.

## 5. Demander un ajout dans un autre chat

Connecter Google Drive dans ce chat et donner le lien de ton tableur privé. Exemple :

> Ajoute une recette de muffins pomme-cannelle à Kousine dans ce Google Sheets : [coller le lien]. Lis d’abord les en-têtes et les identifiants existants. Utilise les onglets Recettes, Ingredients et Etapes. Crée une recette draft avec un identifiant unique, puis ses ingrédients et étapes. Les durées des minuteurs sont en secondes. Relis les lignes écrites et passe seulement ensuite la recette en published. Préserve toutes les autres recettes. Ne modifie pas le code ni GitHub.

L’assistant du nouveau chat doit avoir accès au fichier via la connexion Google Drive. Le lien Apps Script public est destiné à la lecture par l’app ; il ne donne pas le droit d’écrire dans ton tableur.

## Maintenance

- Sauvegarder périodiquement le tableur ou exporter le catalogue depuis l’app. Le JSON de secours dans GitHub ne se met pas à jour tout seul.
- Modifier les données de Sheets ne nécessite pas de redéployer Apps Script. Modifier le **code du script**, en revanche, nécessite de mettre à jour sa version dans **Déployer → Gérer les déploiements**.
- Le format des photos intégrées au JSON est limité par la capacité d’une cellule Sheets ; privilégier des URLs de photos publiques. Le catalogue actuel ne contient aucune photo intégrée.
