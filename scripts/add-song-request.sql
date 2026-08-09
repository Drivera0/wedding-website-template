-- ============================================================
--  Song requests on the RSVP
-- ============================================================
--  Adds a free-text "song you'd like to hear at the wedding" field for the
--  primary guest and for each plus-one. Nullable, so existing rows are fine
--  and the field stays optional on the form.
--
--  Run in the Supabase SQL editor.
--  Supabase dashboard → SQL Editor → paste → Run.
-- ============================================================

alter table public.guests    add column if not exists song_request text;
alter table public.plus_ones add column if not exists song_request text;

comment on column public.guests.song_request    is 'Song the guest would like to hear at the wedding (free text: title / artist).';
comment on column public.plus_ones.song_request is 'Song this plus-one would like to hear at the wedding (free text: title / artist).';
