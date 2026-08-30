-- This migration intentionally removes the legacy unauthenticated data.
-- A public.users row now represents exactly one Supabase Auth user.
truncate table public.recipe_views, public.favorites, public.recipe_tags,
  public.recipe_steps, public.recipe_ingredients, public.recipes,
  public.family_members, public.families, public.users cascade;

alter table public.users alter column id drop default;
alter table public.users
  add constraint users_id_auth_fkey foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  family_id uuid;
  display_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
begin
  insert into public.users (id, name, email) values (new.id, display_name, new.email);
  insert into public.families (name) values ('Famille ' || display_name) returning id into family_id;
  insert into public.family_members (family_id, user_id, role) values (family_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.recipes where id = target_recipe_id and author_id = auth.uid()
  );
$$;

alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.units enable row level security;
alter table public.ingredients enable row level security;
alter table public.tags enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.favorites enable row level security;
alter table public.recipe_views enable row level security;

create policy "read own profile" on public.users for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "read own families" on public.families for select to authenticated using (public.is_family_member(id));
create policy "read family membership" on public.family_members for select to authenticated using (public.is_family_member(family_id));

create policy "read dictionaries" on public.units for select to authenticated using (true);
create policy "manage units" on public.units for all to authenticated using (true) with check (true);
create policy "read ingredients" on public.ingredients for select to authenticated using (true);
create policy "manage ingredients" on public.ingredients for all to authenticated using (true) with check (true);
create policy "read tags" on public.tags for select to authenticated using (true);
create policy "manage tags" on public.tags for all to authenticated using (true) with check (true);

create policy "read visible recipes" on public.recipes for select to authenticated
  using (private = false or public.is_family_member(family_id));
create policy "create own family recipe" on public.recipes for insert to authenticated
  with check (author_id = auth.uid() and public.is_family_member(family_id));
create policy "update own recipe" on public.recipes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_family_member(family_id));
create policy "delete own recipe" on public.recipes for delete to authenticated using (author_id = auth.uid());

create policy "read visible recipe ingredients" on public.recipe_ingredients for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (not r.private or public.is_family_member(r.family_id))));
create policy "manage own recipe ingredients" on public.recipe_ingredients for all to authenticated
  using (public.can_manage_recipe(recipe_id)) with check (public.can_manage_recipe(recipe_id));
create policy "read visible recipe steps" on public.recipe_steps for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (not r.private or public.is_family_member(r.family_id))));
create policy "manage own recipe steps" on public.recipe_steps for all to authenticated
  using (public.can_manage_recipe(recipe_id)) with check (public.can_manage_recipe(recipe_id));
create policy "read visible recipe tags" on public.recipe_tags for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and (not r.private or public.is_family_member(r.family_id))));
create policy "manage own recipe tags" on public.recipe_tags for all to authenticated
  using (public.can_manage_recipe(recipe_id)) with check (public.can_manage_recipe(recipe_id));

create policy "read own favorites" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "create own favorites" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "delete own favorites" on public.favorites for delete to authenticated using (user_id = auth.uid());
create policy "read own history" on public.recipe_views for select to authenticated using (user_id = auth.uid());
create policy "create own history" on public.recipe_views for insert to authenticated with check (user_id = auth.uid());

create policy "public recipe images" on storage.objects for select using (bucket_id = 'recipe-images');
create policy "upload own recipe images" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own recipe images" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and owner_id = auth.uid()::text) with check (bucket_id = 'recipe-images' and owner_id = auth.uid()::text);
create policy "delete own recipe images" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and owner_id = auth.uid()::text);
