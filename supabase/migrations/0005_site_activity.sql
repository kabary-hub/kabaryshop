-- ============================================================================
-- Kabary Shop — Journal d'activité distant en ajout-append (site_activity)
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase → SQL Editor → Run.
--
-- POURQUOI : le journal local « site_history » est synchronisé « par clé »
-- (dernier écrivain gagne) et réservé aux comptes connectés : les visites des
-- CLIENTS (sur leur téléphone, leur navigateur…) ne remontent donc jamais
-- jusqu'à l'administration. Résultat : Admin → Historiques ne montre que les
-- activités des admins/staff.
--
-- SOLUTION : une table APPEND-ONLY. Chaque visiteur peut AJOUTER sa propre
-- activité (visites de pages, abonnements, commandes…) sans jamais pouvoir
-- modifier ou supprimer les entrées des autres. Les admin/staff connectés
-- (Supabase Auth) peuvent tout lire et tout effacer.
--
-- Le site l'utilise via src/services/db.js (appendActivity / fetchCloudActivity)
-- et la page Admin → Historiques fusionne ce journal avec le journal local.
-- ============================================================================

-- 1) Table du journal distant (une ligne = une activité)
create table if not exists public.site_activity (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  entry jsonb not null
);

create index if not exists site_activity_created_at_idx
  on public.site_activity (created_at);

-- 2) Sécurité ligne par ligne (RLS)
alter table public.site_activity enable row level security;

-- Admin / staff connectés (authenticated) : accès complet
-- (lecture + suppression du journal, y compris les entrées des clients)
drop policy if exists site_activity_auth_all on public.site_activity;
create policy site_activity_auth_all on public.site_activity
  for all to authenticated
  using (true)
  with check (true);

-- 3) Droits d'accès : les VISITEURS n'écrivent JAMAIS directement dans la
-- table (ils passent uniquement par la fonction activity_append ci-dessous).
grant select, delete on public.site_activity to authenticated;

-- 4) Fonction d'ajout appelée par le site (append-only pour les visiteurs)
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire (l'insertion
-- et la purge fonctionnent même sans droits directs sur la table).
-- Sécurisée : un visiteur (anon) ne peut PAS se faire passer pour un
-- admin/staff (son rôle d'acteur est normalisé), et la table ne dépasse
-- jamais 10 000 entrées (anti-spam / limite de stockage).
create or replace function public.activity_append(p_entry jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry jsonb := p_entry;
begin
  -- Normalisation pour les visiteurs (anon) : on ne peut pas écrire une
  -- activité en se faisant passer pour un admin / livreur / préparateur.
  -- Les rôles « public » et « Client » (légitimes) sont conservés tels quels.
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

  -- Garde-fou : la table ne dépasse jamais 10 000 lignes (les plus anciennes
  -- sont supprimées à chaque ajout).
  delete from public.site_activity
  where id in (
    select id from public.site_activity
    order by created_at desc, id desc
    offset 10000
  );
end;
$$;

revoke all on function public.activity_append(jsonb) from public;
grant execute on function public.activity_append(jsonb) to anon, authenticated;
