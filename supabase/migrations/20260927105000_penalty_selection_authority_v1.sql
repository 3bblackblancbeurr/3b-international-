-- Selection decisions are serialized per window. Only the trusted game server may call.
create or replace function public.penalty_respond_selection(p_user uuid,p_selection uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_selection public.penalty_international_selections%rowtype;
 v_window public.penalty_international_windows%rowtype;
 v_target text := case when p_accept then 'selected' else 'declined' end;
 v_count integer;
begin
 select w.* into v_window from public.penalty_international_windows w
 join public.penalty_international_selections s on s.window_id=w.id
 where s.id=p_selection and s.user_id=p_user for update of w;
 if not found then raise exception 'Convocation introuvable'; end if;
 select * into v_selection from public.penalty_international_selections where id=p_selection and user_id=p_user for update;
 if v_selection.status=v_target then return to_jsonb(v_selection); end if;
 if v_selection.status<>'preselected' then raise exception 'Convocation déjà traitée'; end if;
 if v_window.status<>'selection' or now()<v_window.starts_at or now()>=v_window.ends_at then raise exception 'Fenêtre fermée'; end if;
 if p_accept then
  if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport actif requis'; end if;
  if not exists(select 1 from public.penalty_ratings r join public.penalty_profiles p using(user_id) where r.user_id=p_user and r.games>=10 and p.reputation>=420 and p.country_id=v_selection.country_id) then raise exception 'Critères sportifs non remplis'; end if;
  select count(*) into v_count from public.penalty_international_selections where window_id=v_window.id and country_id=v_selection.country_id and status='selected';
  if v_count>=12 then raise exception 'Sélection complète'; end if;
 end if;
 update public.penalty_international_selections set status=v_target,updated_at=now() where id=p_selection returning * into v_selection;
 return to_jsonb(v_selection);
end;
$$;
revoke all on function public.penalty_respond_selection(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.penalty_respond_selection(uuid,uuid,boolean) to service_role;

create or replace function public.penalty_join_club(p_user uuid,p_club uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
 perform 1 from public.penalty_clubs where id=p_club for update;
 if not found then raise exception 'Club introuvable'; end if;
 if exists(select 1 from public.penalty_club_members where user_id=p_user and club_id=p_club) then return true; end if;
 if exists(select 1 from public.penalty_club_members where user_id=p_user) then raise exception 'Quitte ton club actuel'; end if;
 select count(*) into v_count from public.penalty_club_members where club_id=p_club;
 if v_count>=30 then raise exception 'Club complet (30 membres)'; end if;
 insert into public.penalty_club_members(club_id,user_id,role) values(p_club,p_user,'member');
 return true;
end;
$$;
revoke all on function public.penalty_join_club(uuid,uuid) from public,anon,authenticated;
grant execute on function public.penalty_join_club(uuid,uuid) to service_role;

create or replace function public.penalty_national_rank(p_user uuid)
returns bigint language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select position from (
  select user_id,row_number() over(order by rating desc,games desc,wins desc,user_id asc) as position
  from public.penalty_ratings where games>=10 and country_id=(select country_id from public.penalty_profiles where user_id=p_user)
 ) ranks where user_id=p_user),0);
$$;
revoke all on function public.penalty_national_rank(uuid) from public,anon,authenticated;
grant execute on function public.penalty_national_rank(uuid) to service_role;
