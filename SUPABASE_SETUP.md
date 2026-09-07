# 🚀 Guide de Configuration Supabase — Kabary Shop

Ce guide explique comment exécuter les migrations SQL pour activer la synchronisation multi-appareils.

## Prérequis

1. Un compte gratuit sur [supabase.com](https://supabase.com)
2. Un projet Supabase créé (sans carte bancaire)

---

## Étape 1 : Créer un projet Supabase

1. Connectez-vous sur [supabase.com](https://supabase.com)
2. Cliquez sur **"New project"**
3. Remplissez :
   - **Organization** : sélectionnez ou créez-en une
   - **Project name** : `kabary-shop` (ou autre)
   - **Database Password** : choisissez un mot de passe fort (gardez-le !)
   - **Region** : choisissez la plus proche (ou `West Europe` pour la Guinée)
4. Cliquez sur **"Create new project"**
5. Attendez 1-2 minutes que le projet soit initialisé

---

## Étape 2 : Récupérer les clés API

1. Dans votre projet, allez dans **Project Settings → API**
2. Copiez ces deux valeurs :

| Valeur | Où la trouver |
|--------|---------------|
| **Project URL** | `Settings → API → Project URL` |
| **anon public** | `Settings → API → anon public key` |

3. Ouvrez le fichier `.env` à la racine du projet et ajoutez :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Étape 3 : Exécuter les migrations SQL

### 3.1 Ouvrir l'éditeur SQL

1. Dans le dashboard Supabase, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**

### 3.2 Exécuter la Migration 1 : Table sync_store

Copiez et collez le contenu du fichier `supabase/migrations/0001_init_sync_store.sql` :

```sql
-- Créer la table sync_store
create table if not exists public.sync_store (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sync_store_updated_at_idx on public.sync_store (updated_at desc);

alter table public.sync_store enable row level security;

drop policy if exists sync_store_public_all on public.sync_store;
create policy sync_store_public_all
  on public.sync_store
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on table public.sync_store to anon, authenticated;
```

Cliquez sur **"Run"** (ou `Ctrl+Enter`).

### 3.3 Exécuter la Migration 2 : Sécurité RLS

Nouveau query → Collez le contenu de `0002_auth_rls.sql` :

```sql
-- Supprimer l'ancienne politique
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

-- authenticated : accès complet
create policy sync_store_auth_all on public.sync_store
  for all to authenticated
  using (true)
  with check (true);
```

Cliquez sur **"Run"**.

### 3.4 Exécuter la Migration 3 : Fonction sync_upsert

Nouveau query → Collez le contenu de `0003_sync_upsert_rpc.sql` :

```sql
create or replace function public.sync_upsert(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.sync_upsert(text, jsonb) from public;
grant execute on function public.sync_upsert(text, jsonb) to anon, authenticated;
```

Cliquez sur **"Run"**.

### 3.5 Exécuter la Migration 4 : Produits supprimés

Nouveau query → Collez le contenu de `0004_deleted_products_rls.sql` :

```sql
create policy sync_store_anon_select_deleted_products on public.sync_store
  for select to anon
  using (key = 'deleted_products');
```

Cliquez sur **"Run"**.

### 3.6 Exécuter la Migration 5 : Journal d'activité

Nouveau query → Collez le contenu de `0005_site_activity.sql` :

```sql
-- Table du journal distant
create table if not exists public.site_activity (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  entry jsonb not null
);

create index if not exists site_activity_created_at_idx
  on public.site_activity (created_at);

alter table public.site_activity enable row level security;

-- Admin / staff : accès complet
drop policy if exists site_activity_auth_all on public.site_activity;
create policy site_activity_auth_all on public.site_activity
  for all to authenticated
  using (true)
  with check (true);

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
  -- Normalisation pour les visiteurs
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

revoke all on function public.activity_append(jsonb) from public;
grant execute on function public.activity_append(jsonb) to anon, authenticated;
```

Cliquez sur **"Run"**.

---

## Étape 4 : Activer Realtime

1. Allez dans **Database → Replication** (menu de gauche)
2. Dans la section **"Supabase Public"**, activez les tables :
   - ✅ `sync_store`
   - ✅ `site_activity`
3. Cliquez sur **"Save"**

---

## Étape 5 : Désactiver la confirmation email (optionnel)

Pour que les comptes admin/staff créés automatiquement soient utilisables immédiatement :

1. Allez dans **Authentication → Providers → Email**
2. Décochez **"Confirm email"**
3. Cliquez sur **"Save"**

---

## Étape 6 : Tester la connexion

1. Démarrez le site :
   ```bash
   npm run dev
   ```

2. Ouvrez le site dans **deux navigateurs différents** (ou un navigateur + un onglet privé)

3. Dans l'un des deux :
   - Appuyez sur `Ctrl+Shift+A` pour accéder à l'admin
   - Connectez-vous avec vos identifiants

4. Modifiez un paramètre (ex: le nom du site dans **Paramètres**)

5. Vérifiez que le changement apparaît dans l'autre navigateur en temps réel !

---

## 🔍 Vérification

Pour vérifier que les données sont bien synchronisées :

1. Dans le dashboard Supabase, allez dans **Table Editor**
2. Ouvrez la table `sync_store`
3. Vous devriez voir les lignes :
   - `kabary_settings` (paramètres du site)
   - `custom_products` (produits ajoutés)
   - `categories` (catégories)
   - etc.

---

## ❓ Problèmes courants

### "Accès refusé" dans la console
→ Les migrations n'ont pas été exécutées dans l'ordre. Revérifiez les étapes 3.2 à 3.6.

### Les données ne se synchronisent pas
→ Vérifiez que Realtime est activé (Étape 4).

### "Invalid API key"
→ Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont correctement copiés dans `.env`.

### La connexion admin échoue
→ Vérifiez que la confirmation email est désactivée (Étape 5).

---

## 📁 Fichiers SQL

Toutes les migrations se trouvent dans :
```
supabase/migrations/
├── 0001_init_sync_store.sql
├── 0002_auth_rls.sql
├── 0003_sync_upsert_rpc.sql
├── 0004_deleted_products_rls.sql
└── 0005_site_activity.sql
```

Vous pouvez aussi les exécuter directement depuis le dashboard Supabase en les important dans **SQL Editor → Import**.
re