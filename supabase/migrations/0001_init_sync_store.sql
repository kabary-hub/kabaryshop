-- ============================================================================
-- Kabary Shop — Table de synchronisation multi-appareils
-- ----------------------------------------------------------------------------
-- Le site stocke ses données dans le localStorage de chaque navigateur.
-- Pour synchroniser entre plusieurs ordinateurs, chaque clé localStorage est
-- miroitée dans cette table clé/valeur (une ligne par clé) :
--
--   shop_orders, app_users, custom_products, categories, kabary_settings,
--   admin_password, site_history, order_logs, site_subscribers,
--   site_publications, product_reviews, site_feedback
--
-- Le composant src/services/SyncProvider.jsx :
--   • pousse les changements locaux (upsert) ici ;
--   • écoute Supabase Realtime (postgres_changes) pour propager les
--     changements distants vers le localStorage de chaque navigateur ouvert.
--
-- ⚠️ SECURITÉ : le site n'a pas encore de système de comptes (Supabase Auth).
-- La politique RLS ci-dessous autorise lecture + écriture pour tous (clés
-- « anon » et « authenticated »). C'est le compromis nécessaire pour que
-- chaque navigateur puisse lire/écrire la même donnée sans authentification.
-- Dès que Supabase Auth sera intégré, restreindre ces politiques par rôle.
-- ============================================================================

create table if not exists public.sync_store (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Index sur la date de mise à jour (utile pour trier / nettoyer)
create index if not exists sync_store_updated_at_idx on public.sync_store (updated_at desc);

-- Active la sécurité au niveau des lignes (obligatoire sur Supabase)
alter table public.sync_store enable row level security;

-- Politique : tout le monde peut lire et écrire (voir note de sécurité ci-dessus)
drop policy if exists sync_store_public_all on public.sync_store;
create policy sync_store_public_all
  on public.sync_store
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Droits d'accès explicites pour les rôles utilisés par le client
grant usage on schema public to anon, authenticated;
grant all on table public.sync_store to anon, authenticated;
