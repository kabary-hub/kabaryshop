-- ============================================================================
-- 🚀 KABARY SHOP — SETUP COMPLET SUPABASE
-- ============================================================================
-- Ce fichier combine les 5 migrations SQL en une seule exécution.
-- 
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase → SQL Editor → New query
-- 2. Copiez TOUT le contenu de ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez "Run" (ou Ctrl+Enter)
--
-- ✅ Vous devriez voir "Success. No rows returned" à chaque étape.
-- ============================================================================


-- ============================================================================
-- MIGRATION 1 : Table sync_store (synchronisation multi-appareils)
-- ============================================================================

-- Table de synchronisation clé/valeur
create table if not exists public.sync_store (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Index pour les performances
create index if not exists sync_store_updated_at_idx on public.sync_store (updated_at desc);

-- Active la sécurité au niveau des lignes (RLS)
alter table public.sync_store enable row level security;

-- Politique temporaire (sera remplacée par la migration 2)
drop policy if exists sync_store_public_all on public.sync_store;
create policy sync_store_public_all
  on public.sync_store
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Droits d'accès
grant usage on schema public to anon, authenticated;
grant all on table public.sync_store to anon, authenticated;


-- ============================================================================
-- MIGRATION 2 : Sécurité RLS (restreindre l'accès par rôle)
-- ============================================================================

-- Supprime l'ancienne politique « tout le monde peut tout »
drop policy if exists sync_store_public_all on public.sync_store;

-- anon : LECTURE des données d'affichage uniquement
create policy sync_store_anon_select on public.sync_store
  for select to anon
  using (key in (
    'custom_products', 'categories', 'kabary_settings', 'site_publications',
    'product_reviews', 'site_feedback'
  ));

-- anon : ÉCRITURE des données créées par les clients
create policy sync_store_anon_insert on public.sync_store
  for insert to anon
  with check (key in (
    'shop_orders', 'product_reviews', 'site_feedback', 'site_subscribers'
  ));

create policy sync_store_anon_update on public.sync_store
  for update to anon
  using (key in (
    'shop_orders', 'product_reviews', 'site_feedback', 'site_subscribers'
  ))
  with check (key in (
    'shop_orders', 'product_reviews', 'site_feedback', 'site_subscribers'
  ));

-- authenticated (admin/staff) : accès complet
create policy sync_store_auth_all on public.sync_store
  for all to authenticated
  using (true)
  with check (true);


-- ============================================================================
-- MIGRATION 3 : Fonction sync_upsert (anti-blocage PostgreSQL)
-- ============================================================================

create or replace function public.sync_upsert(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clés que les VISITEURS peuvent écrire
  if auth.role() = 'authenticated' or p_key in (
    'shop_orders', 'product_reviews', 'site_feedback', 'site_subscribers'
  ) then
    insert into public.sync_store (key, value, updated_at)
    values (p_key, p_value, now())
    on conflict (key)
    do update set value = excluded.value, updated_at = excluded.updated_at;
  else
    raise exception 'Accès refusé : la clé « % » ne peut pas être écrite par un visiteur.', p_key;
  end if;
end;
$$;

-- Droits d'exécution
revoke all on function public.sync_upsert(text, jsonb) from public;
grant execute on function public.sync_upsert(text, jsonb) to anon, authenticated;


-- ============================================================================
-- MIGRATION 4 : Lecture publique des produits supprimés
-- ============================================================================

create policy sync_store_anon_select_deleted_products on public.sync_store
  for select to anon
  using (key = 'deleted_products');


-- ============================================================================
-- MIGRATION 5 : Journal d'activité distant (site_activity)
-- ============================================================================

-- Table du journal distant (append-only)
create table if not exists public.site_activity (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  entry jsonb not null
);

create index if not exists site_activity_created_at_idx
  on public.site_activity (created_at);

-- Sécurité ligne par ligne (RLS)
alter table public.site_activity enable row level security;

-- Admin/staff : accès complet
drop policy if exists site_activity_auth_all on public.site_activity;
create policy site_activity_auth_all on public.site_activity
  for all to authenticated
  using (true)
  with check (true);

-- Droits d'accès
grant select, delete on public.site_activity to authenticated;

-- Fonction d'ajout (append-only pour les visiteurs)
create or replace function public.activity_append(p_entry jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry jsonb := p_entry;
begin
  -- Normalisation pour les visiteurs (anon)
  if auth.role() = 'anon' then
    declare
      r text := coalesce(v_entry #>> '{actor,role}', '');
    begin
      if r not in ('public', 'Client') then
        v_entry := jsonb_set(coalesce(v_entry, '{}'::jsonb), '{actor,role}', '"public"');
      end if;
    end;
    if coalesce(v_entry #>> '{actor,name}', '') = '' then
      v_entry := jsonb_set(v_entry, '{actor,name}', '"Visiteur"');
    end if;
  end if;

  insert into public.site_activity (entry) values (v_entry);

  -- Garde-fou : 10 000 lignes max
  delete from public.site_activity
  where id in (
    select id from public.site_activity
    order by created_at desc, id desc
    offset 10000
  );
end;
$$;

-- Droits d'exécution
revoke all on function public.activity_append(jsonb) from public;
grant execute on function public.activity_append(jsonb) to anon, authenticated;


-- ============================================================================
-- ✅ SETUP TERMINÉ !
-- ============================================================================
-- 
-- Prochaines étapes :
-- 1. Activer Realtime : Database → Replication → activer sync_store et site_activity
-- 2. Désactiver confirmation email : Authentication → Providers → Email → décocher "Confirm email"
-- 3. Ajouter les credentials dans .env :
--    VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
--    VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
-- 4. Relancer : npm run dev
--
-- ============================================================================
