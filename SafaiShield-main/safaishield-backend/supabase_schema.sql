-- SafaiShield — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Private job records (never exposed to public via API without auth)
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  local_id      text unique not null,
  device_id     text not null,
  site_type     text check (site_type in ('septic_tank','sewer','ewaste_pit','drain_canal')),
  last_cleaned_date date,
  risk_tier     text check (risk_tier in ('LOW','MEDIUM','HIGH')),
  risk_reason   text,
  started_at    timestamptz,
  ended_at      timestamptz,
  gear_confirmed boolean,
  employer_name text,
  language      text default 'en',
  evidence_hash text,
  synced_at     timestamptz default now()
);

-- Public aggregated map points — NO worker ID, NO exact coords
create table danger_map_points (
  id              uuid primary key default gen_random_uuid(),
  lat_rounded     numeric(5,2) not null,
  lng_rounded     numeric(5,2) not null,
  risk_tier       text,
  gear_compliance boolean,
  site_type       text,
  month_year      text,
  created_at      timestamptz default now()
);

-- Worker profile (Telegram link only, no caste/name required)
create table worker_profiles (
  device_id         text primary key,
  telegram_chat_id  text,
  language          text default 'en',
  created_at        timestamptz default now()
);

-- Telegram link codes (short-lived)
create table telegram_link_codes (
  code              text primary key,
  device_id         text not null,
  telegram_chat_id  text,
  created_at        timestamptz default now()
);

-- Companion sessions for buddy verification
create table companion_sessions (
  code          text primary key,
  device_id     text not null,
  job_id        text not null,
  companion_name text,
  verified      boolean default false,
  created_at    timestamptz default now()
);

-- RLS: danger_map_points is public read, insert only via service key
alter table danger_map_points enable row level security;
create policy "public read" on danger_map_points for select using (true);

-- jobs table: private, no public access at all
alter table jobs enable row level security;

-- telegram_link_codes: expire after 10 min (handle in application logic or a cron)
