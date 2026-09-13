-- ============================================================
--  Table numbers for the seating plan
-- ============================================================
--  Run in the Supabase SQL editor.
--
--  Each person who is coming (main guest or plus one) can be given a table in
--  Admin > Guest list. It is per person rather than per invitation, because a
--  party doesn't always sit together (a kids' table, for instance).
-- ============================================================

alter table public.guests    add column if not exists table_name text;
alter table public.plus_ones add column if not exists table_name text;

-- Sets the table for one person. Guest and plus one ids are both random uuids,
-- so one id finds exactly one of the two.
create or replace function public.admin_set_table(p_key text, p_id uuid, p_table text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_table text := nullif(trim(coalesce(p_table, '')), '');
begin
  perform public.assert_admin(p_key);
  update public.guests set table_name = v_table where id = p_id;
  if not found then
    update public.plus_ones set table_name = v_table where id = p_id;
  end if;
end;
$$;

-- Same as before, plus table_name for the guest and each plus one.
create or replace function public.admin_list_guests(p_key text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  result jsonb;
begin
  perform public.assert_admin(p_key);

  select coalesce(jsonb_agg(g order by g.rsvp_seq), '[]'::jsonb) into result
  from (
    select
      gu.id, gu.rsvp_seq, gu.name, gu.email, gu.phone, gu.dietary_restrictions,
      gu.status, gu.notes, gu.song_request, gu.table_name, gu.response_date, gu.created_at,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', po.id, 'guest_id', po.guest_id, 'name', po.name,
          'dietary_restrictions', po.dietary_restrictions,
          'song_request', po.song_request, 'table_name', po.table_name, 'created_at', po.created_at,
          'guest_dietary', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', gd.id, 'guest_id', gd.guest_id, 'plus_one_id', gd.plus_one_id,
              'dietary_option_id', gd.dietary_option_id,
              'dietary_options', jsonb_build_object('id', d.id, 'name', d.name, 'sort_order', d.sort_order)
            ))
            from public.guest_dietary gd
            join public.dietary_options d on d.id = gd.dietary_option_id
            where gd.plus_one_id = po.id
          ), '[]'::jsonb)
        ) order by po.created_at)
        from public.plus_ones po where po.guest_id = gu.id
      ), '[]'::jsonb) as plus_ones,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', gd.id, 'guest_id', gd.guest_id, 'plus_one_id', gd.plus_one_id,
          'dietary_option_id', gd.dietary_option_id,
          'dietary_options', jsonb_build_object('id', d.id, 'name', d.name, 'sort_order', d.sort_order)
        ))
        from public.guest_dietary gd
        join public.dietary_options d on d.id = gd.dietary_option_id
        where gd.guest_id = gu.id
      ), '[]'::jsonb) as guest_dietary
    from public.guests gu
  ) g;

  return result;
end;
$$;

grant execute on function public.admin_set_table(text, uuid, text) to anon, authenticated;
