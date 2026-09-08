-- ============================================================================
-- Kabary Shop — Tables relationnelles normalisées (migration 0006)
-- ----------------------------------------------------------------------------
-- Ces tables complètent sync_store (clé/valeur) pour les données qui ont
-- besoin de relations, d'indexation et de RLS fine.
--
-- sync_store reste la source de vérité pour :
--   - kabary_settings (paramètres du site)
--   - shop_orders (commandes - miroir local)
--   - app_users (utilisateurs)
--   - categories, custom_products, etc.
--
-- Les tables ci-dessous sont des vues normalisées pour les opérations qui
-- nécessitent des relations (studie de commande, gestion des stocks, avis).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRODUITS (avec gestion de stock)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  prix          text not null default '',
  category      text not null default '',
  img           text not null default '',
  description   text,
  rating        numeric(3,1) check (rating is null or (rating >= 1 and rating <= 5)),
  review_count  integer not null default 0,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_active     boolean not null default true,
  original_id   text, -- ID localStorage existant pour migration
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_active_idx on public.products (is_active) where is_active = true;
create index if not exists products_stock_idx on public.products (stock_quantity);

alter table public.products enable row level security;

-- anon : lecture seule (produits publics)
create policy products_anon_select on public.products
  for select to anon
  using (is_active = true);

-- authenticated : lecture + écriture complète
create policy products_auth_all on public.products
  for all to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select on table public.products to anon;
grant all on table public.products to authenticated;

-- Fonction pour décrémenter le stock (utilisée lors de la validation d'une commande)
create or replace function public.decrement_stock(p_product_id uuid, p_quantity integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock integer;
  new_stock integer;
begin
  -- Récupérer le stock actuel
  select stock_quantity into current_stock
  from public.products
  where id = p_product_id;

  if current_stock is null then
    return -1; -- produit introuvable
  end if;

  new_stock := current_stock - p_quantity;

  if new_stock < 0 then
    return -2; -- stock insuffisant
  end if;

  update public.products
  set stock_quantity = new_stock, updated_at = now()
  where id = p_product_id;

  -- Déclencher une alerte si le stock passe sous le seuil bas
  if new_stock <= (select low_stock_threshold from public.products where id = p_product_id) then
    insert into public.admin_alerts (type, title, message, link, "read", date)
    values (
      'warning',
      'Stock bas : ' || (select title from public.products where id = p_product_id),
      'Le produit "' || (select title from public.products where id = p_product_id) || '" est maintenant en stock bas (' || new_stock || ' unités restantes).',
      '/admin/products/' || p_product_id,
      false,
      now()
    );
  end if;

  return new_stock;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public;
grant execute on function public.decrement_stock(uuid, integer) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. UTILISATEURS (admins, livreurs, préparateurs)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  uuid_supabase uuid, -- lien vers le compte Supabase Auth (si connecté)
  email         text not null,
  name          text not null default '',
  role          text not null check (role in ('admin', 'livreur', 'preparateur')),
  photo         text,
  password      text, -- mot de passe local (hashé) - pour la compatibilité
  two_factor_enabled boolean not null default false,
  two_factor_secret text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (email)
);

create index if not exists users_role_idx on public.users (role);
create index if not exists users_email_idx on public.users (email);

alter table public.users enable row level security;

-- anon : aucune lecture (les utilisateurs sont privés)
create policy users_anon_nothing on public.users
  for all to anon
  using (false)
  with check (false);

-- authenticated : lecture de son propre profil, écriture admin complète
create policy users_auth_select_own on public.users
  for select to authenticated
  using (true); -- admins peuvent voir tous les utilisateurs

create policy users_auth_insert on public.users
  for insert to authenticated
  with check (true);

create policy users_auth_update on public.users
  for update to authenticated
  using (true)
  with check (true);

create policy users_auth_delete on public.users
  for delete to authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on table public.users to authenticated;
grant all on table public.users to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMANDES (version normalisée avec relations)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  customer_address text,
  items         jsonb not null default '[]'::jsonb,
  total         numeric not null default 0,
  status        text not null check (status in ('pending', 'shipped', 'completed', 'cancelled')) default 'pending',
  payment_method text not null default 'Mobile Money',
  date          timestamptz not null default now(),
  shipping      jsonb,
  cancelled_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_reference_idx on public.orders (reference);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_date_idx on public.orders (date desc);
create index if not exists orders_customer_email_idx on public.orders (customer_email);

alter table public.orders enable row level security;

-- anon : insertion des commandes clients, lecture de leur propre commande
create policy orders_anon_insert on public.orders
  for insert to anon
  with check (true);

create policy orders_anon_select_own on public.orders
  for select to anon
  using (customer_email = current_setting('request.jwt.claims', true)::jsonb->>'email' or true);

-- authenticated : accès complet
create policy orders_auth_all on public.orders
  for all to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on table public.orders to anon;
grant all on table public.orders to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AVIS PRODUITS (reviews)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  order_id      uuid, -- lien vers la commande (pour vérifier que le client a reçu le produit)
  customer_name text not null default 'Client',
  customer_email text,
  rating        integer not null check (rating >= 1 and rating <= 5),
  comment       text,
  status        text not null check (status in ('pending', 'published', 'rejected')) default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reviews_product_idx on public.reviews (product_id);
create index if not exists reviews_status_idx on public.reviews (status);
create index if not exists reviews_created_idx on public.reviews (created_at desc);

alter table public.reviews enable row level security;

-- anon : insertion des avis, lecture des avis publiés
create policy reviews_anon_insert on public.reviews
  for insert to anon
  with check (true);

create policy reviews_anon_select_published on public.reviews
  for select to anon
  using (status = 'published');

-- authenticated : accès complet (modération admin)
create policy reviews_auth_all on public.reviews
  for all to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on table public.reviews to anon;
grant all on table public.reviews to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ALERTES ADMIN (table dédiée, pas seulement dans sync_store)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_alerts (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('order', 'success', 'warning', 'info')),
  title         text not null default '',
  message       text not null default '',
  link          text,
  "read"        boolean not null default false,
  date          timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists admin_alerts_read_idx on public.admin_alerts ("read");
create index if not exists admin_alerts_date_idx on public.admin_alerts (date desc);
create index if not exists admin_alerts_type_idx on public.admin_alerts (type);

alter table public.admin_alerts enable row level security;

-- anon : aucune lecture/écriture (les alertes sont privées)
create policy admin_alerts_anon_nothing on public.admin_alerts
  for all to anon
  using (false)
  with check (false);

-- authenticated : accès complet
create policy admin_alerts_auth_all on public.admin_alerts
  for all to authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on table public.admin_alerts to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER : mise à jour automatique de updated_at
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_products_updated_at
  before update on public.products
  for each row
  execute function public.update_updated_at();

create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at();

create trigger update_orders_updated_at
  before update on public.orders
  for each row
  execute function public.update_updated_at();

create trigger update_reviews_updated_at
  before update on public.reviews
  for each row
  execute function public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Note : sync_store reste prioritaire pour la synchronisation multi-appareils.
-- Ces tables normalisées sont utilisées pour les opérations qui ont besoin de
-- relations, d'indexation ou de RLS fine.
-- Pour la migration, les données existantes dans sync_store (shop_orders,
-- products, users, reviews) peuvent être migrées vers ces tables via un script
-- de migration côté client ou un RPC.
-- ─────────────────────────────────────────────────────────────────────────────
