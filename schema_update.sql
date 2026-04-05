-- Run this in the Supabase SQL editor if you already ran schema.sql
-- Adds the messages column for chat-style debate storage

alter table debates add column if not exists messages jsonb default '[]'::jsonb;
