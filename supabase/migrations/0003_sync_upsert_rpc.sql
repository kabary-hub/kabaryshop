-- ============================================================================
-- Kabary Shop — Fonction d'upsert sécurisée (sync_upsert)
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase → SQL Editor → Run.
--
-- POURQUOI : PostgreSQL bloque les « upsert » (INSERT ... ON CONFLICT DO
-- UPDATE) sur les lignes EXISTANTES quand la sécurité RLS est active, même si
-- l'INSERT et l'UPDATE séparés seraient autorisés. Le site utilise pourtant
-- des upserts pour synchroniser (ex. une commande qui met à jour la liste
-- des commandes).
--
-- SOLUTION : une fonction SECURITY DEFINER (s'exécute avec les droits du
-- propriétaire, sans les limitations RLS de l'appelant) qui :
--   • accepte les visiteurs (anon) UNIQUEMENT pour les clés créées par les
--     clients : shop_orders, product_reviews, site_feedback, site_subscribers ;
--   • accepte TOUTES les clés pour les comptes connectés (authenticated).
--
-- Le site appelle cette fonction via `sb.rpc('sync_upsert', …)` au lieu d'un
-- upsert direct sur la table (voir src/services/SyncProvider.jsx).
-- ============================================================================

create or replace function public.sync_upsert(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clés que les VISITEURS peuvent écrire (données créées par les clients).
  -- Les comptes connectés (admin/staff) peuvent écrire toutes les clés.
  if auth.role() = 'authenticated' or p_key in (
    'shop_orders',
    'product_reviews',
    'site_feedback',
    'site_subscribers'
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

-- Droits d'exécution : visiteurs ET comptes connectés peuvent appeler la
-- fonction (elle vérifie elle-même les autorisations par rôle).
revoke all on function public.sync_upsert(text, jsonb) from public;
grant execute on function public.sync_upsert(text, jsonb) to anon, authenticated;
