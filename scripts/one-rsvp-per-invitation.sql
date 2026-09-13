-- ============================================================
--  One RSVP per invitation, never more people than invited
-- ============================================================
--  Run in the Supabase SQL editor.
--
--  Before this, submit_rsvp trusted the browser completely:
--    * an RSVP needed no invitation at all (the shared codes were
--      checked only in JavaScript),
--    * the same invitation link could be used to RSVP again and again,
--    * the plus-one limit was only a disabled "+" button, so anyone calling
--      the API directly could add as many guests as they liked.
--  All three are now refused by the database, whatever the browser sends.
--
--  It also adds the contact details the invitations are sent with (phone,
--  how to send), plus side and group for sorting the guest list, and a bulk
--  import for the spreadsheet.
-- ============================================================

-- ── Invitation details ──────────────────────────────────────
alter table public.invitations
  add column if not exists phone text,
  add column if not exists send_via text,
  add column if not exists side text,
  add column if not exists guest_group text;

alter table public.invitations drop constraint if exists invitations_send_via_check;
alter table public.invitations add constraint invitations_send_via_check
  check (send_via is null or send_via in ('whatsapp', 'email', 'both', 'in_person'));

-- An RSVP belongs to at most one invitation.
create unique index if not exists invitations_guest_id_unique
  on public.invitations (guest_id) where guest_id is not null;

-- The invitation is now what identifies a guest, so email no longer has to.
-- WhatsApp guests may not give one, and two invitations can share an address.
alter table public.guests drop constraint if exists guests_email_key;
alter table public.guests alter column email drop not null;

-- Nothing calls this any more, and it let anyone holding a code rewrite which
-- RSVP their invitation pointed at.
drop function if exists public.mark_invitation_responded(text, uuid);

-- ── Guests ──────────────────────────────────────────────────
create or replace function public.submit_rsvp(
  p_name text, p_email text, p_attending boolean, p_dietary_ids integer[],
  p_dietary_other text, p_song text, p_plus_ones jsonb default '[]'::jsonb,
  p_invite_code text default null
)
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_inv      public.invitations;
  v_email    text;
  v_named    int;
  v_guest_id uuid;
  v_po       jsonb;
  v_po_id    uuid;
  v_opt      int;
begin
  if coalesce(trim(p_invite_code), '') = '' then
    raise exception 'INVITE_REQUIRED';
  end if;

  -- Lock the invitation row, so two submissions racing on the same code
  -- queue up and the second one sees the first one's answer.
  select * into v_inv
    from public.invitations
   where lower(code) = lower(trim(p_invite_code))
   for update;
  if not found then
    raise exception 'INVITE_INVALID';
  end if;
  if v_inv.guest_id is not null or v_inv.responded_at is not null then
    raise exception 'ALREADY_RESPONDED';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED';
  end if;
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'EMAIL_INVALID';
  end if;

  select count(*) into v_named
    from jsonb_array_elements(coalesce(p_plus_ones, '[]'::jsonb)) e
   where coalesce(trim(e->>'name'), '') <> '';
  if p_attending and v_named > v_inv.max_additional then
    raise exception 'TOO_MANY_GUESTS';
  end if;

  insert into public.guests (name, email, phone, status, dietary_restrictions, song_request)
  values (
    trim(p_name),
    v_email,
    v_inv.phone,
    case when p_attending then 'confirmed' else 'declined' end,
    case when p_attending then nullif(trim(coalesce(p_dietary_other, '')), '') end,
    nullif(trim(coalesce(p_song, '')), '')
  )
  returning id into v_guest_id;

  if p_attending and p_dietary_ids is not null then
    foreach v_opt in array p_dietary_ids loop
      insert into public.guest_dietary (guest_id, dietary_option_id) values (v_guest_id, v_opt);
    end loop;
  end if;

  if p_attending then
    for v_po in select * from jsonb_array_elements(coalesce(p_plus_ones, '[]'::jsonb)) loop
      continue when coalesce(trim(v_po->>'name'), '') = '';

      insert into public.plus_ones (guest_id, name, dietary_restrictions, song_request)
      values (
        v_guest_id,
        trim(v_po->>'name'),
        nullif(trim(coalesce(v_po->>'dietary_other', '')), ''),
        nullif(trim(coalesce(v_po->>'song_request', '')), '')
      )
      returning id into v_po_id;

      if v_po ? 'dietary_option_ids' then
        for v_opt in select (value)::int from jsonb_array_elements_text(v_po->'dietary_option_ids') loop
          insert into public.guest_dietary (plus_one_id, dietary_option_id) values (v_po_id, v_opt);
        end loop;
      end if;
    end loop;
  end if;

  update public.invitations
     set responded_at = now(), guest_id = v_guest_id
   where id = v_inv.id;

  return v_guest_id;
end;
$$;

create or replace function public.resolve_invitation(p_code text)
returns table(name text, email text, max_additional integer, responded boolean)
language plpgsql security definer set search_path to 'public'
as $$
begin
  update public.invitations i
     set opened_at = coalesce(i.opened_at, now())
   where lower(i.code) = lower(trim(p_code));

  return query
    select i.name, i.email, i.max_additional,
           (i.responded_at is not null or i.guest_id is not null)
      from public.invitations i
     where lower(i.code) = lower(trim(p_code));
end;
$$;

-- ── Admin: responses ────────────────────────────────────────
-- Deleting a response reopens its invitation, so that guest can use their
-- link once more. This is how you let someone change their answer.
create or replace function public.admin_delete_guest(p_key text, p_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_admin(p_key);
  update public.invitations set responded_at = null, guest_id = null where guest_id = p_id;
  delete from public.guests where id = p_id;
end;
$$;

create or replace function public.admin_clear_guests(p_key text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_admin(p_key);
  update public.invitations set responded_at = null, guest_id = null
   where responded_at is not null or guest_id is not null;
  delete from public.guests where true;
end;
$$;

-- ── Admin: invitations ──────────────────────────────────────
create or replace function public.admin_list_invitations(p_key text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare result jsonb;
begin
  perform public.assert_admin(p_key);

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
    into result
  from (
    select jsonb_build_object(
      'id', i.id,
      'code', i.code,
      'name', i.name,
      'email', i.email,
      'phone', i.phone,
      'send_via', i.send_via,
      'side', i.side,
      'guest_group', i.guest_group,
      'max_additional', i.max_additional,
      'sent_at', i.sent_at,
      'opened_at', i.opened_at,
      'responded_at', i.responded_at,
      'guest_id', i.guest_id,
      'notes', i.notes,
      'created_at', i.created_at,
      'guest', case when g.id is null then null else jsonb_build_object(
        'id', g.id,
        'rsvp_seq', g.rsvp_seq,
        'name', g.name,
        'email', g.email,
        'status', g.status,
        'song_request', g.song_request,
        'notes', g.notes,
        'created_at', g.created_at,
        'dietary', coalesce((
          select jsonb_agg(d.name order by d.sort_order)
          from public.guest_dietary gd
          join public.dietary_options d on d.id = gd.dietary_option_id
          where gd.guest_id = g.id
        ), '[]'::jsonb),
        'dietary_other', g.dietary_restrictions,
        'plus_ones', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', po.name,
            'song_request', po.song_request,
            'dietary_other', po.dietary_restrictions,
            'dietary', coalesce((
              select jsonb_agg(d2.name order by d2.sort_order)
              from public.guest_dietary gd2
              join public.dietary_options d2 on d2.id = gd2.dietary_option_id
              where gd2.plus_one_id = po.id
            ), '[]'::jsonb)
          ) order by po.created_at)
          from public.plus_ones po where po.guest_id = g.id
        ), '[]'::jsonb),
        'party_size', 1 + (select count(*) from public.plus_ones po2 where po2.guest_id = g.id)
      ) end
    ) as row
    from public.invitations i
    left join public.guests g on g.id = i.guest_id
  ) rows;

  return result;
end;
$$;

-- The new arguments all default, so an older admin page still in someone's
-- browser tab keeps working until it is refreshed.
drop function if exists public.admin_add_invitation(text, text, text, integer);
create or replace function public.admin_add_invitation(
  p_key text, p_name text, p_email text, p_max_additional integer,
  p_phone text default null, p_send_via text default null,
  p_side text default null, p_group text default null, p_notes text default null
)
returns public.invitations
language plpgsql security definer set search_path to 'public'
as $$
declare row public.invitations;
begin
  perform public.assert_admin(p_key);
  if coalesce(trim(p_name), '') = '' then
    raise exception 'NAME_REQUIRED';
  end if;

  insert into public.invitations (code, name, email, phone, send_via, side, guest_group, notes, max_additional)
  values (
    public.generate_invite_code(),
    trim(p_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_send_via, '')), ''),
    nullif(trim(coalesce(p_side, '')), ''),
    nullif(trim(coalesce(p_group, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    greatest(0, coalesce(p_max_additional, 0))
  )
  returning * into row;

  return row;
end;
$$;

drop function if exists public.admin_update_invitation(text, uuid, text, text, integer, text);
create or replace function public.admin_update_invitation(
  p_key text, p_id uuid, p_name text, p_email text, p_max_additional integer, p_notes text,
  p_phone text default null, p_send_via text default null,
  p_side text default null, p_group text default null
)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_admin(p_key);
  update public.invitations
     set name = coalesce(nullif(trim(p_name), ''), name),
         email = nullif(trim(coalesce(p_email, '')), ''),
         phone = nullif(trim(coalesce(p_phone, '')), ''),
         send_via = nullif(trim(coalesce(p_send_via, '')), ''),
         side = nullif(trim(coalesce(p_side, '')), ''),
         guest_group = nullif(trim(coalesce(p_group, '')), ''),
         max_additional = greatest(0, coalesce(p_max_additional, max_additional)),
         notes = nullif(trim(coalesce(p_notes, '')), '')
   where id = p_id;
end;
$$;

-- Sent can now be undone, for when WhatsApp was opened but not actually sent.
drop function if exists public.admin_mark_sent(text, uuid[]);
create or replace function public.admin_mark_sent(p_key text, p_ids uuid[], p_sent boolean default true)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_admin(p_key);
  update public.invitations
     set sent_at = case when p_sent then coalesce(sent_at, now()) end
   where id = any(p_ids);
end;
$$;

-- Bulk import from the guest list spreadsheet, in one transaction. A name that
-- is already on the list (or twice in the file) is skipped rather than
-- duplicated, so importing the same sheet again is harmless.
create or replace function public.admin_import_invitations(p_key text, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  r       jsonb;
  v_name  text;
  added   jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  row     public.invitations;
begin
  perform public.assert_admin(p_key);

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_name := trim(coalesce(r->>'name', ''));
    continue when v_name = '';

    if exists (select 1 from public.invitations where lower(name) = lower(v_name)) then
      skipped := skipped || to_jsonb(v_name);
      continue;
    end if;

    insert into public.invitations (code, name, email, phone, send_via, side, guest_group, notes, max_additional)
    values (
      public.generate_invite_code(),
      v_name,
      nullif(trim(coalesce(r->>'email', '')), ''),
      nullif(trim(coalesce(r->>'phone', '')), ''),
      nullif(trim(coalesce(r->>'send_via', '')), ''),
      nullif(trim(coalesce(r->>'side', '')), ''),
      nullif(trim(coalesce(r->>'guest_group', '')), ''),
      nullif(trim(coalesce(r->>'notes', '')), ''),
      greatest(0, coalesce((r->>'max_additional')::int, 0))
    )
    returning * into row;

    added := added || to_jsonb(row);
  end loop;

  return jsonb_build_object('added', added, 'skipped', skipped);
end;
$$;

grant execute on function public.admin_add_invitation(text, text, text, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_update_invitation(text, uuid, text, text, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_mark_sent(text, uuid[], boolean) to anon, authenticated;
grant execute on function public.admin_import_invitations(text, jsonb) to anon, authenticated;
