-- P0: Mandantentrennung per Row-Level-Security (Cockpit-Kennzahlen).
-- Gilt fuer Postgres (Frankfurt/EU). Keine Geheimnisse in dieser Datei.

create schema if not exists myadmin;

create table if not exists myadmin.kennzahl (
  id          bigserial primary key,
  tenant_id   text        not null,
  name        text        not null,
  wert        numeric     not null,
  einheit     text,
  quelle      text        not null,
  zeitpunkt   timestamptz not null default now()
);

create index if not exists kennzahl_tenant_zeit_idx
  on myadmin.kennzahl (tenant_id, zeitpunkt desc);

alter table myadmin.kennzahl enable row level security;
alter table myadmin.kennzahl force row level security;

drop policy if exists kennzahl_tenant_isolation on myadmin.kennzahl;
create policy kennzahl_tenant_isolation on myadmin.kennzahl
  using  (tenant_id = current_setting('myadmin.tenant', true))
  with check (tenant_id = current_setting('myadmin.tenant', true));

-- App-Rolle: kein Superuser, kein BYPASSRLS - sonst greift die Policy nicht.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'myadmin_app') then
    create role myadmin_app login;
  end if;
end
$$;

grant usage on schema myadmin to myadmin_app;
grant select, insert on myadmin.kennzahl to myadmin_app;
grant usage, select on sequence myadmin.kennzahl_id_seq to myadmin_app;
