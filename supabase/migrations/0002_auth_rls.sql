-- ============================================================================
-- Kabary Shop — Sécurisation de sync_store avec Supabase Auth
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase → SQL Editor → Run.
--
-- Avant : n'importe qui (clé « anon ») pouvait LIRE et ÉCRIRE toutes les
-- données (mots de passe staff, commandes clients…).
--
-- Après :
--   • anon (visiteurs NON connectés) :
--       - LECTURE uniquement des données d'affichage du site ;
--       - ÉCRITURE uniquement des données créées par les clients
--         (commandes, avis, feedback, abonnements newsletter) ;
--       - aucune lecture des mots de passe, commandes, logs.
--   • authenticated (admin/staff connectés via Supabase Auth) : accès COMPLET.
--
-- ⚠️ En parallèle, activer côté projet :
--   Authentication → Sign In / Up → Email → désactiver « Confirm email »,
--   pour que les comptes cloud créés automatiquement par le site soient
--   immédiatement utilisables.
-- ============================================================================

-- 1) Supprime l'ancienne politique « tout le monde peut tout »
drop policy if exists sync_store_public_all on public.sync_store;

-- 2) anon : LECTURE des données d'affichage uniquement
--    (produits, catégories, paramètres publics, publications, avis, feedback)
create policy sync_store_anon_select on public.sync_store
  for select to anon
  using (key in (
    'custom_products', 'categories', 'kabary_settings', 'site_publications',
    'product_reviews', 'site_feedback'
  ));

-- 3) anon : ÉCRITURE des données créées par les clients
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

-- (pas de DELETE pour anon : les visiteurs ne suppriment jamais de données)

-- 4) authenticated (admin / staff via Supabase Auth) : accès complet
create policy sync_store_auth_all on public.sync_store
  for all to authenticated
  using (true)
  with check (true);
