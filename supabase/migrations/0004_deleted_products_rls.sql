-- ============================================================================
-- Kabary Shop — Lecture publique de la liste des produits supprimés
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase → SQL Editor → Run.
--
-- Contexte : pour supprimer durablement un produit PAR DÉFAUT du catalogue
-- (régénéré à chaque chargement depuis les images du bundle), le site
-- enregistre son ID dans la clé localStorage "deleted_products" (tombstone).
--
-- Cette clé est synchronisée (SYNC_KEYS). Les visiteurs doivent pouvoir la
-- LIRE pour que le site public masque les produits supprimés, même sur un
-- appareil qui vient de se synchroniser. L'écriture reste réservée aux
-- comptes connectés (admin/staff) — voir sync_upsert (0003).
-- ============================================================================

-- anon : LECTURE de la liste des produits supprimés
create policy sync_store_anon_select_deleted_products on public.sync_store
  for select to anon
  using (key = 'deleted_products');
