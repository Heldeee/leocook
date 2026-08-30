create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

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

create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text not null unique
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_unit_id uuid references public.units(id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  author_id uuid not null references public.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  private boolean not null default true,
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
  duration_seconds int,
  unique (recipe_id, step_number)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table public.recipe_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index recipe_views_user_viewed_at_idx on public.recipe_views (user_id, viewed_at desc);
create index recipes_name_fts_idx on public.recipes using gin (to_tsvector('french', name));
create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);
create index recipe_tags_tag_id_idx on public.recipe_tags (tag_id);

insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true)
on conflict (id) do update set public = excluded.public;

insert into public.units (name, abbreviation) values
  ('gramme', 'g'), ('kilogramme', 'kg'), ('millilitre', 'ml'), ('litre', 'l'),
  ('cuillère à soupe', 'c. à s.'), ('cuillère à café', 'c. à c.'),
  ('pièce', 'pc'), ('pincée', 'pincée');

-- Deliberately no RLS here: the current UI identifies a person only through
-- localStorage, not Supabase Auth. Enabling policies before adding real auth
-- would make the application unusable without securing it.
