# Recettes de famille

App de recettes de cuisine familiale — React + MUI + Supabase.

## Stack

- **Front** : React (Vite) + MUI, déployé sur GitHub Pages
- **Back** : Supabase (Postgres + Auth + Storage), Row Level Security pour toute la logique de permissions

## Mise en route

### 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un nouveau projet.
2. Dans l'éditeur SQL du dashboard, colle et exécute le contenu de `supabase/schema.sql`.
   Ça crée toutes les tables et une poignée d'unités de mesure de base.
   **Pas d'authentification** : la RLS est désactivée, l'accès est géré à la main
   en ne partageant l'URL/la clé anon qu'avec les gens de confiance.
3. Dans **Storage**, crée un bucket public nommé `recipe-images` (utilisé pour les
   photos de recettes).
4. Récupère `Project URL` et la clé `anon public` dans Project Settings > API.

### 2. Configurer le front

```bash
cp .env.example .env.local
# remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local
npm install
npm run dev
```

### 3. Créer les utilisateurs et la famille (à la main, dans Supabase)

Pas de formulaire d'inscription : tu crées tout depuis le Table Editor de Supabase.

1. Table `users` : une ligne par personne (juste `name`, `email` optionnel).
2. Table `families` : une ligne (ex: "Famille Dupont").
3. Table `family_members` : pour chaque personne, une ligne reliant son `user_id`
   à la `family_id`, avec `role = 'owner'` ou `'member'`.
4. Recharge l'app : chaque personne se choisit dans le menu déroulant en haut à
   droite ("Qui es-tu ?") — son choix est mémorisé sur son navigateur.

## Déploiement sur GitHub Pages

```bash
npm run build
```

Ça génère `dist/`. Options de déploiement :

- **Manuel** : pousse le contenu de `dist/` sur la branche `gh-pages` (ex. via
  le package `gh-pages`, ou une GitHub Action `actions/deploy-pages`).
- Pense à mettre à jour `base` dans `vite.config.js` avec le vrai nom de ton repo
  GitHub avant de builder (`/mon-repo/`), sinon les assets ne se chargeront pas
  correctement une fois déployés.
- Les variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` doivent être
  disponibles au moment du `build` (secrets GitHub Actions si tu automatises).

## Fonctionnalités déjà en place

- Auth email/mot de passe (via Supabase Auth)
- Liste des recettes avec recherche par mot-clé + filtre par tag
- Détail de recette : ingrédients, étapes, tags
- **Mode guidé ("à la Moulinex")** : une étape à la fois, avec minuteur si l'étape en a un
- Favoris (ajout/suppression, page dédiée)
- Historique de consultation
- Création de recette : ingrédients dynamiques (existants ou créés à la volée),
  étapes avec minuteur optionnel, tags (existants ou créés à la volée), upload photo
- Visibilité par recette : privée à la famille ou publique à toute l'app (RLS)

## Pistes pour la suite

- UI de gestion des familles (créer / inviter / quitter)
- Édition et suppression de recette (le formulaire actuel ne gère que la création)
- Scaling des quantités selon le nombre de portions choisi
- Dictionnaire de traduction (mentionné dans le TODO initial, pas prioritaire)
- Pagination / infinite scroll sur la liste si le nombre de recettes grandit
