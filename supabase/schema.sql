-- ============================================================
-- Recipe App — Supabase schema
-- Run this in Supabase SQL editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Users (managed manually — no login/auth, you create rows by hand)
-- ------------------------------------------------------------
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Families
-- ------------------------------------------------------------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- ------------------------------------------------------------
-- Units (predefined, avoids "g"/"gramme"/"gr" duplicates)
-- ------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,        -- "gramme"
  abbreviation text not null unique -- "g"
);

-- ------------------------------------------------------------
-- Ingredients
-- ------------------------------------------------------------
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_unit_id uuid references public.units(id)
);

-- ------------------------------------------------------------
-- Tags (free-text, created on the fly)
-- ------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ------------------------------------------------------------
-- Recipes
-- ------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  author_id uuid not null references public.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  private boolean not null default true, -- true = family only, false = visible app-wide
  servings int not null default 4,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric not null,
  unit_id uuid not null references public.units(id),
  primary key (recipe_id, ingredient_id)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_number int not null,
  instruction text not null,
  duration_seconds int, -- nullable, powers the "Moulinex mode" timer
  unique (recipe_id, step_number)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ------------------------------------------------------------
-- Favorites
-- ------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ------------------------------------------------------------
-- History (recipe views)
-- ------------------------------------------------------------
create table public.recipe_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index on public.recipe_views (user_id, viewed_at desc);

-- ------------------------------------------------------------
-- Helpful indexes for search
-- ------------------------------------------------------------
create index on public.recipes using gin (to_tsvector('french', name));
create index on public.recipe_ingredients (ingredient_id);
create index on public.recipe_tags (tag_id);

-- ============================================================
-- Row Level Security — disabled.
-- No login flow: access is controlled manually by you (who you
-- give the anon key/URL to), not by Postgres policies tied to
-- auth.uid(). If you ever add login back, re-enable RLS and
-- restore the policies here.
-- ============================================================
alter table public.users disable row level security;
alter table public.families disable row level security;
alter table public.family_members disable row level security;
alter table public.units disable row level security;
alter table public.ingredients disable row level security;
alter table public.tags disable row level security;
alter table public.recipes disable row level security;
alter table public.recipe_ingredients disable row level security;
alter table public.recipe_steps disable row level security;
alter table public.recipe_tags disable row level security;
alter table public.favorites disable row level security;
alter table public.recipe_views disable row level security;
-- Seed a few common units (optional, adjust as needed)
-- ============================================================
insert into public.units (name, abbreviation) values
  ('gramme', 'g'),
  ('kilogramme', 'kg'),
  ('millilitre', 'ml'),
  ('litre', 'l'),
  ('cuillère à soupe', 'c. à s.'),
  ('cuillère à café', 'c. à c.'),
  ('pièce', 'pc'),
  ('pincée', 'pincée');
