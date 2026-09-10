-- Program 3B: balances can only change inside service-only transactions.
begin;
create table public.member_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check(handle ~ '^[a-z0-9][a-z0-9._-]{2,23}$'),
 name text not null check(length(name) between 2 and 80),
 country text not null check(country in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne')),
 xp bigint not null default 0 check(xp>=0), points bigint not null default 0 check(points>=0),
 theme text not null default 'discovery', recovery_hash text not null check(recovery_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now()
);
create table public.member_ledger (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.member_profiles(user_id) on delete cascade,
 event_key text not null unique, source text not null, label text not null,
 xp integer not null, points integer not null, created_at timestamptz not null default now()
);
create index member_ledger_owner_time on public.member_ledger(user_id,created_at desc);
create table public.member_game_saves (
 user_id uuid primary key references public.member_profiles(user_id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=180000),
 updated_at timestamptz not null default now()
);
create table public.member_game_runs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.member_profiles(user_id) on delete cascade,
 game text not null check(game in ('arena','tower','maze','refuge','cities')),
 started_at timestamptz not null default now(),last_beat timestamptz not null default now(),seq integer not null default 0,
 active_seconds integer not null default 0,ended boolean not null default false
);
create unique index member_one_active_run on public.member_game_runs(user_id) where not ended;
create index member_runs_owner on public.member_game_runs(user_id,started_at);
create table public.member_rate_limits (key text primary key,started_at timestamptz not null default now(),hits integer not null default 1);
create table public.member_purchase_rewards (
 session_id text primary key, user_id uuid not null references public.member_profiles(user_id) on delete cascade,
 payment_intent text unique not null, merchandise_cents bigint not null check(merchandise_cents>=0),
 refunded_cents bigint not null default 0, points integer not null,xp integer not null,created_at timestamptz not null default now()
);
create index member_purchases_owner on public.member_purchase_rewards(user_id);
alter table public.member_profiles enable row level security;
alter table public.member_ledger enable row level security;
alter table public.member_game_saves enable row level security;
alter table public.member_game_runs enable row level security;
alter table public.member_rate_limits enable row level security;
alter table public.member_purchase_rewards enable row level security;
revoke all on public.member_profiles,public.member_ledger,public.member_game_saves,public.member_game_runs,public.member_rate_limits,public.member_purchase_rewards from public,anon,authenticated;
grant all on public.member_profiles,public.member_ledger,public.member_game_saves,public.member_game_runs,public.member_rate_limits,public.member_purchase_rewards to service_role;
grant usage,select on sequence public.member_ledger_id_seq to service_role;
grant select(user_id,handle,name,country,xp,points,theme,created_at) on public.member_profiles to authenticated;
grant select on public.member_ledger to authenticated;
grant select,insert,update on public.member_game_saves to authenticated;
create policy member_profile_owner on public.member_profiles for select to authenticated using((select auth.uid())=user_id);
create policy member_ledger_owner on public.member_ledger for select to authenticated using((select auth.uid())=user_id);
create policy member_saves_owner_read on public.member_game_saves for select to authenticated using((select auth.uid())=user_id);
create policy member_saves_owner_insert on public.member_game_saves for insert to authenticated with check((select auth.uid())=user_id);
create policy member_saves_owner_update on public.member_game_saves for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create function public.loyalty_rate(p_key text,p_limit integer,p_window integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.member_rate_limits where started_at<now()-interval '2 days';
 insert into public.member_rate_limits(key) values(p_key) on conflict(key) do update set
 hits=case when member_rate_limits.started_at<now()-make_interval(secs=>p_window) then 1 else member_rate_limits.hits+1 end,
 started_at=case when member_rate_limits.started_at<now()-make_interval(secs=>p_window) then now() else member_rate_limits.started_at end returning hits into n;
 return n<=p_limit;
end;$$;
create function public.loyalty_grant(p_user uuid,p_key text,p_source text,p_label text,p_xp integer,p_points integer) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.member_profiles where user_id=p_user for update;
 if not found then raise exception 'Profil introuvable';end if;
 insert into public.member_ledger(user_id,event_key,source,label,xp,points) values(p_user,p_key,p_source,p_label,p_xp,p_points) on conflict(event_key) do nothing;
 if not found then return false;end if;
 update public.member_profiles set xp=greatest(0,xp+p_xp),points=greatest(0,points+p_points) where user_id=p_user;
 return true;
end;$$;
create function public.loyalty_mission(p_user uuid,p_kind text) returns boolean language plpgsql security invoker set search_path='' as $$
declare k text;l text;x integer;p integer;
begin
 if p_kind='daily' then k='daily:'||(now() at time zone 'Europe/Paris')::date;l='Rendez-vous quotidien';x=10;p=2;
 elsif p_kind in ('passport','manga','world3b') then k='explore:'||p_kind;l=case p_kind when 'passport' then 'Découverte du passeport' when 'manga' then 'Découverte du manga' else 'Découverte des huit pays' end;x=20;p=2;
 else raise exception 'Mission inconnue';end if;
 return public.loyalty_grant(p_user,p_user||':'||k,'mission',l,x,p);
end;$$;
create function public.loyalty_start_game(p_user uuid,p_game text) returns uuid language plpgsql security invoker set search_path='' as $$
declare run_id uuid;
begin
 perform 1 from public.member_profiles where user_id=p_user for update;
 update public.member_game_runs set ended=true where user_id=p_user and not ended;
 delete from public.member_game_runs where user_id=p_user and started_at<now()-interval '30 days';
 insert into public.member_game_runs(user_id,game) values(p_user,p_game) returning id into run_id;return run_id;
end;$$;
create function public.loyalty_game_beat(p_user uuid,p_run uuid,p_seq integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.member_game_runs; seconds integer;new_seconds integer; x integer;p integer;used_x integer;used_p integer;
begin
 perform 1 from public.member_profiles where user_id=p_user for update;
 select * into r from public.member_game_runs where id=p_run and user_id=p_user for update;
 if not found or r.ended then raise exception 'Partie expirée';end if;
 if p_seq<=r.seq then return jsonb_build_object('xp',0,'points',0);end if;
 seconds=floor(extract(epoch from now()-r.last_beat));
 if seconds<10 then return jsonb_build_object('xp',0,'points',0);end if;
 -- Long gaps never count as offline or paused play time.
 seconds=case when seconds>45 then 0 else least(20,seconds) end;
 new_seconds=r.active_seconds+seconds;
 x=(new_seconds/30-r.active_seconds/30)*10;p=new_seconds/60-r.active_seconds/60;
 select coalesce(sum(xp),0),coalesce(sum(points),0) into used_x,used_p from public.member_ledger
 where user_id=p_user and source='game' and created_at>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris');
 x=greatest(0,least(x,600-used_x));p=greatest(0,least(p,20-used_p));
 update public.member_game_runs set active_seconds=new_seconds,last_beat=now(),seq=p_seq where id=p_run;
 if x>0 or p>0 then perform public.loyalty_grant(p_user,'game:'||p_run||':'||p_seq,'game','Temps de jeu · '||r.game,x,p);end if;
 return jsonb_build_object('xp',x,'points',p);
end;$$;
create function public.loyalty_record_purchase(p_user uuid,p_session text,p_intent text,p_cents bigint) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_cents<0 or p_cents>100000000 then raise exception 'Montant invalide';end if;
 perform 1 from public.member_profiles where user_id=p_user for update;
 n=p_cents/10;
 insert into public.member_purchase_rewards(session_id,user_id,payment_intent,merchandise_cents,points,xp) values(p_session,p_user,p_intent,p_cents,n,n) on conflict do nothing;
 if not found then return false;end if;
 return public.loyalty_grant(p_user,'purchase:'||p_session,'purchase','Achat boutique · '||right(p_session,8),n,n);
end;$$;
create function public.loyalty_refund_purchase(p_intent text,p_refunded bigint) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.member_purchase_rewards;n integer;difference integer;
begin
 select * into r from public.member_purchase_rewards where payment_intent=p_intent;
 if not found then return false;end if;
 perform 1 from public.member_profiles where user_id=r.user_id for update;
 select * into r from public.member_purchase_rewards where payment_intent=p_intent for update;
 if p_refunded<=r.refunded_cents then return false;end if;
 n=greatest(0,(r.merchandise_cents-least(r.merchandise_cents,p_refunded))/10);difference=n-r.points;
 update public.member_purchase_rewards set refunded_cents=p_refunded,points=n,xp=n where session_id=r.session_id;
 return public.loyalty_grant(r.user_id,'refund:'||p_intent||':'||p_refunded,'refund','Ajustement après remboursement',difference,difference);
end;$$;
create function public.loyalty_recovery(p_handle text,p_old text,p_new text) returns uuid language plpgsql security invoker set search_path='' as $$
declare uid uuid;
begin
 update public.member_profiles set recovery_hash=p_new where handle=p_handle and recovery_hash=p_old returning user_id into uid;return uid;
end;$$;
grant usage on schema auth to service_role;
grant select on auth.sessions to service_role;
create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql security invoker set search_path='' as $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user);$$;
revoke all on function public.loyalty_rate(text,integer,integer),public.loyalty_grant(uuid,text,text,text,integer,integer),public.loyalty_mission(uuid,text),public.loyalty_start_game(uuid,text),public.loyalty_game_beat(uuid,uuid,integer),public.loyalty_record_purchase(uuid,text,text,bigint),public.loyalty_refund_purchase(text,bigint),public.loyalty_recovery(text,text,text),public.loyalty_session_valid(uuid,uuid) from public,anon,authenticated;
grant execute on function public.loyalty_rate(text,integer,integer),public.loyalty_grant(uuid,text,text,text,integer,integer),public.loyalty_mission(uuid,text),public.loyalty_start_game(uuid,text),public.loyalty_game_beat(uuid,uuid,integer),public.loyalty_record_purchase(uuid,text,text,bigint),public.loyalty_refund_purchase(text,bigint),public.loyalty_recovery(text,text,text),public.loyalty_session_valid(uuid,uuid) to service_role;
commit;
