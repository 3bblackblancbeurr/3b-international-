-- 3B International — Owner inbox + member notifications foundation.
-- Additive staging SQL. This file is intentionally outside migrations until rollout is approved.
begin;

create table if not exists public.member_notifications(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text unique,
  kind text not null check(kind ~ '^[a-z0-9_.:-]{3,64}$'),
  severity text not null default 'info' check(severity in ('info','important','urgent','critical')),
  title text not null check(length(title) between 2 and 160),
  body text not null default '' check(length(body)<=1500),
  route text check(route is null or length(route)<=80),
  metadata jsonb not null default '{}'::jsonb
    check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=8192),
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Account deletion hardening discovered during the notification/privacy audit.
-- Community content belongs to the deleted community profile and must not block auth deletion.
alter table public.community_posts
  drop constraint if exists community_posts_author_id_fkey,
  add constraint community_posts_author_id_fkey
    foreign key(author_id) references public.community_profiles(user_id) on delete cascade;

alter table public.community_chat
  drop constraint if exists community_chat_author_id_fkey,
  add constraint community_chat_author_id_fkey
    foreign key(author_id) references public.community_profiles(user_id) on delete cascade;

-- Keep challenge review history after a staff account disappears, without retaining its account FK.
alter table public.sport_challenge_reviews alter column reviewer_id drop not null;
alter table public.sport_challenge_reviews
  drop constraint if exists sport_challenge_reviews_reviewer_id_fkey,
  add constraint sport_challenge_reviews_reviewer_id_fkey
    foreign key(reviewer_id) references auth.users(id) on delete set null;

-- The delete-account service transfers an owned club first when another member exists.
-- CASCADE is the safe fallback for direct/admin account deletion or a single-member club.
alter table public.penalty_clubs
  drop constraint if exists penalty_clubs_owner_user_id_fkey,
  add constraint penalty_clubs_owner_user_id_fkey
    foreign key(owner_user_id) references auth.users(id) on delete cascade;

create or replace function public.prepare_account_deletion(p_user uuid) returns jsonb
language plpgsql security definer set search_path=''
as $account_delete$
declare
  v_club record;
  v_successor uuid;
  v_transferred integer:=0;
  v_deleted integer:=0;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  for v_club in
    select id from public.penalty_clubs where owner_user_id=p_user for update
  loop
    select m.user_id into v_successor
    from public.penalty_club_members m
    where m.club_id=v_club.id and m.user_id<>p_user
    order by (m.role='captain') desc,m.joined_at asc,m.user_id
    limit 1;

    if v_successor is null then
      delete from public.penalty_clubs where id=v_club.id;
      v_deleted:=v_deleted+1;
    else
      update public.penalty_club_members
      set role=case when user_id=v_successor then 'owner' else role end
      where club_id=v_club.id;

      update public.penalty_clubs
      set owner_user_id=v_successor,updated_at=now()
      where id=v_club.id;

      delete from public.penalty_club_members
      where club_id=v_club.id and user_id=p_user;

      v_transferred:=v_transferred+1;
    end if;
  end loop;

  return jsonb_build_object('transferred_clubs',v_transferred,'deleted_clubs',v_deleted);
end
$account_delete$;

revoke all on function public.prepare_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

create index if not exists member_notifications_user_unread_idx
  on public.member_notifications(user_id,created_at desc) where read_at is null;
create index if not exists member_notifications_user_created_idx
  on public.member_notifications(user_id,created_at desc);

create table if not exists public.owner_inbox_events(
  id bigint generated always as identity primary key,
  event_key text unique,
  category text not null check(category in (
    'accounts','community','moderation','sport','shop','requests','security',
    'secret3b','games','world','ai','system','privacy','marketplace'
  )),
  event_type text not null check(event_type ~ '^[a-z0-9_.:-]{3,80}$'),
  severity text not null default 'info' check(severity in ('info','important','urgent','critical')),
  title text not null check(length(title) between 2 and 180),
  summary text not null default '' check(length(summary)<=2000),
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_type text check(subject_type is null or length(subject_type)<=60),
  subject_ref text check(subject_ref is null or length(subject_ref)<=180),
  payload jsonb not null default '{}'::jsonb
    check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=16384),
  status text not null default 'new' check(status in ('new','in_progress','done','archived')),
  read_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_inbox_status_priority_idx
  on public.owner_inbox_events(status,severity,created_at desc);
create index if not exists owner_inbox_unread_idx
  on public.owner_inbox_events(created_at desc) where read_at is null;
create index if not exists owner_inbox_category_idx
  on public.owner_inbox_events(category,created_at desc);

create table if not exists public.owner_action_log(
  id bigint generated always as identity primary key,
  owner_user_id uuid references auth.users(id) on delete set null,
  action text not null check(action ~ '^[a-z0-9_.:-]{3,80}$'),
  target_type text check(target_type is null or length(target_type)<=60),
  target_ref text check(target_ref is null or length(target_ref)<=180),
  before_state jsonb not null default '{}'::jsonb check(jsonb_typeof(before_state)='object'),
  after_state jsonb not null default '{}'::jsonb check(jsonb_typeof(after_state)='object'),
  detail jsonb not null default '{}'::jsonb
    check(jsonb_typeof(detail)='object' and octet_length(detail::text)<=16384),
  created_at timestamptz not null default now()
);
create index if not exists owner_action_log_created_idx on public.owner_action_log(created_at desc);

create table if not exists public.threeb_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check(category in (
    'account','sport','shop','creator','partnership','event','press','technical','privacy','other'
  )),
  subject text not null check(length(subject) between 3 and 140),
  message text not null check(length(message) between 10 and 4000),
  status text not null default 'new' check(status in ('new','in_progress','answered','closed')),
  priority text not null default 'normal' check(priority in ('normal','important','urgent')),
  owner_reply text check(owner_reply is null or length(owner_reply)<=4000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists threeb_requests_user_created_idx on public.threeb_requests(user_id,created_at desc);
create index if not exists threeb_requests_status_idx on public.threeb_requests(status,priority,created_at);

create table if not exists public.community_moderation_events(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check(source_kind in ('chat','post','profile','request')),
  source_id text,
  decision text not null check(decision in ('mask','block','escalate','restriction','manual_clear')),
  severity smallint not null check(severity between 1 and 4),
  reasons text[] not null default '{}',
  excerpt text not null default '' check(length(excerpt)<=500),
  detail jsonb not null default '{}'::jsonb
    check(jsonb_typeof(detail)='object' and octet_length(detail::text)<=8192),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists community_moderation_user_idx
  on public.community_moderation_events(user_id,created_at desc);
create index if not exists community_moderation_open_idx
  on public.community_moderation_events(severity,created_at desc) where resolved_at is null;

create table if not exists public.community_moderation_state(
  user_id uuid primary key references auth.users(id) on delete cascade,
  strike_score integer not null default 0 check(strike_score between 0 and 1000),
  restricted_until timestamptz,
  last_violation_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.member_notifications enable row level security;
alter table public.owner_inbox_events enable row level security;
alter table public.owner_action_log enable row level security;
alter table public.threeb_requests enable row level security;
alter table public.community_moderation_events enable row level security;
alter table public.community_moderation_state enable row level security;

revoke all on public.member_notifications,public.owner_inbox_events,public.owner_action_log,
  public.threeb_requests,public.community_moderation_events,public.community_moderation_state
  from public,anon,authenticated;

grant select on public.member_notifications to authenticated;
grant update(read_at) on public.member_notifications to authenticated;
grant select on public.threeb_requests to authenticated;

grant all on public.member_notifications,public.owner_inbox_events,public.owner_action_log,
  public.threeb_requests,public.community_moderation_events,public.community_moderation_state
  to service_role;

grant usage,select on sequence public.member_notifications_id_seq to service_role;
grant usage,select on sequence public.owner_inbox_events_id_seq to service_role;
grant usage,select on sequence public.owner_action_log_id_seq to service_role;
grant usage,select on sequence public.community_moderation_events_id_seq to service_role;

drop policy if exists member_notifications_read_own on public.member_notifications;
create policy member_notifications_read_own on public.member_notifications
  for select to authenticated
  using((select auth.uid())=user_id and (select member_private.session_active()));

drop policy if exists member_notifications_mark_own on public.member_notifications;
create policy member_notifications_mark_own on public.member_notifications
  for update to authenticated
  using((select auth.uid())=user_id and (select member_private.session_active()))
  with check((select auth.uid())=user_id and (select member_private.session_active()));

drop policy if exists threeb_requests_read_own on public.threeb_requests;
create policy threeb_requests_read_own on public.threeb_requests
  for select to authenticated
  using((select auth.uid())=user_id and (select member_private.session_active()));

create or replace function member_private.enqueue_member_notification(
  p_user uuid,p_event_key text,p_kind text,p_severity text,p_title text,p_body text,p_route text,p_metadata jsonb
) returns void
language plpgsql security definer set search_path=''
as $$
begin
  if p_user is null then return; end if;
  insert into public.member_notifications(user_id,event_key,kind,severity,title,body,route,metadata)
  values(p_user,nullif(p_event_key,''),p_kind,p_severity,left(p_title,160),left(coalesce(p_body,''),1500),p_route,coalesce(p_metadata,'{}'::jsonb))
  on conflict(event_key) do nothing;
end
$$;

create or replace function member_private.enqueue_owner_event(
  p_event_key text,p_category text,p_event_type text,p_severity text,p_title text,p_summary text,
  p_actor uuid,p_subject_type text,p_subject_ref text,p_payload jsonb
) returns void
language plpgsql security definer set search_path=''
as $$
begin
  insert into public.owner_inbox_events(
    event_key,category,event_type,severity,title,summary,actor_user_id,subject_type,subject_ref,payload
  ) values(
    nullif(p_event_key,''),p_category,p_event_type,p_severity,left(p_title,180),left(coalesce(p_summary,''),2000),
    p_actor,p_subject_type,p_subject_ref,coalesce(p_payload,'{}'::jsonb)
  )
  on conflict(event_key) do nothing;
end
$$;

revoke all on function member_private.enqueue_member_notification(uuid,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function member_private.enqueue_owner_event(text,text,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function member_private.bump_owner_counter_event(
  p_event_key text,p_category text,p_event_type text,p_title text,p_actor uuid,p_counter text
) returns void
language plpgsql security definer set search_path=''
as $counter$
begin
  insert into public.owner_inbox_events(
    event_key,category,event_type,severity,title,summary,actor_user_id,subject_type,subject_ref,payload
  ) values(
    p_event_key,p_category,p_event_type,'info',p_title,'1 événement aujourd’hui.',p_actor,
    'daily_summary',p_event_key,jsonb_build_object(p_counter,1)
  )
  on conflict(event_key) do update
  set payload=jsonb_set(
        public.owner_inbox_events.payload,
        array[p_counter],
        to_jsonb(coalesce((public.owner_inbox_events.payload->>p_counter)::integer,0)+1),
        true
      ),
      summary=(coalesce((public.owner_inbox_events.payload->>p_counter)::integer,0)+1)::text||' événements aujourd’hui.',
      updated_at=now();
end
$counter$;
revoke all on function member_private.bump_owner_counter_event(text,text,text,text,uuid,text) from public,anon,authenticated;

create or replace function member_private.sync_control_owner_staff() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.owner_user_id is not null then
    insert into public.community_staff(user_id) values(new.owner_user_id) on conflict do nothing;
  end if;
  return new;
end
$$;
revoke all on function member_private.sync_control_owner_staff() from public,anon,authenticated;

drop trigger if exists sync_control_owner_staff on public.control_center_settings;
create trigger sync_control_owner_staff
after insert or update of owner_user_id on public.control_center_settings
for each row execute function member_private.sync_control_owner_staff();

insert into public.community_staff(user_id)
select owner_user_id from public.control_center_settings
where singleton=true and owner_user_id is not null
on conflict do nothing;

create or replace function member_private.scrub_deleted_member_owner_refs() returns trigger
language plpgsql security definer set search_path=''
as $privacy$
begin
  update public.owner_inbox_events
  set actor_user_id=null,
      subject_ref=case when subject_ref=old.user_id::text then null else subject_ref end,
      event_key=case when position(old.user_id::text in coalesce(event_key,''))>0 then 'redacted:'||id::text else event_key end,
      payload=payload-'user_id'-'actor_user_id'-'member_id',
      updated_at=now()
  where actor_user_id=old.user_id
     or subject_ref=old.user_id::text
     or payload->>'user_id'=old.user_id::text;

  update public.owner_action_log
  set target_ref=case when target_ref=old.user_id::text then null else target_ref end,
      before_state=before_state-'actor_user_id'-'subject_ref'-'user_id',
      after_state=after_state-'actor_user_id'-'subject_ref'-'user_id'
  where target_ref=old.user_id::text
     or before_state->>'actor_user_id'=old.user_id::text
     or after_state->>'actor_user_id'=old.user_id::text;
  return old;
end
$privacy$;
revoke all on function member_private.scrub_deleted_member_owner_refs() from public,anon,authenticated;

drop trigger if exists privacy_scrub_deleted_member_owner_refs on public.member_profiles;
create trigger privacy_scrub_deleted_member_owner_refs
before delete on public.member_profiles
for each row execute function member_private.scrub_deleted_member_owner_refs();

create or replace function member_private.notify_member_profile_change() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform member_private.bump_owner_counter_event(
      'account.registrations:'||to_char(now() at time zone 'UTC','YYYYMMDD'),
      'accounts','account.registrations.daily','Nouvelles inscriptions 3B',null,'registrations'
    );
    perform member_private.enqueue_member_notification(
      new.user_id,'account.welcome:'||new.user_id::text,'account.welcome','info',
      'Bienvenue dans 3B International',
      'Ton compte 3B est actif. Tes informations importantes, réponses et demandes apparaîtront désormais ici.',
      'notifications',jsonb_build_object('country',new.country)
    );
    return new;
  end if;
  perform member_private.bump_owner_counter_event(
    'account.deletions:'||to_char(now() at time zone 'UTC','YYYYMMDD'),
    'accounts','account.deletions.daily','Comptes 3B supprimés',null,'deletions'
  );
  return old;
end
$$;
revoke all on function member_private.notify_member_profile_change() from public,anon,authenticated;
drop trigger if exists owner_member_profile_events on public.member_profiles;
create trigger owner_member_profile_events
after insert or delete on public.member_profiles
for each row execute function member_private.notify_member_profile_change();

create or replace function member_private.notify_community_post() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.category in ('challenge','collaboration') then
    perform member_private.enqueue_owner_event(
      'community.post:'||new.id::text,'community','community.'||new.category,'important',
      case when new.category='challenge' then 'Nouveau défi proposé' else 'Nouvelle collaboration proposée' end,
      left(new.title,180),new.author_id,'community_post',new.id::text,
      jsonb_build_object('category',new.category,'title',new.title)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_community_post() from public,anon,authenticated;
drop trigger if exists owner_community_post_events on public.community_posts;
create trigger owner_community_post_events
after insert on public.community_posts
for each row execute function member_private.notify_community_post();

create or replace function member_private.notify_community_report() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  perform member_private.enqueue_owner_event(
    'community.report:'||new.id::text,'moderation','community.reported','urgent',
    'Nouveau signalement','Un membre a signalé un contenu.',new.user_id,new.kind,new.target_id::text,
    jsonb_build_object('report_id',new.id,'kind',new.kind,'reason',left(new.reason,500))
  );
  return new;
end
$$;
revoke all on function member_private.notify_community_report() from public,anon,authenticated;
drop trigger if exists owner_community_report_events on public.community_reports;
create trigger owner_community_report_events
after insert on public.community_reports
for each row execute function member_private.notify_community_report();

create or replace function member_private.notify_sport_entry() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_title text;
begin
  if new.status=old.status then return new; end if;
  select title into v_title from public.sport_challenges where id=new.challenge_id;
  if new.status='submitted' then
    perform member_private.enqueue_owner_event(
      'sport.submitted:'||new.user_id::text||':'||new.challenge_id||':'||coalesce(extract(epoch from new.submitted_at)::bigint::text,'0'),
      'sport','sport.challenge.submitted','important','Défi sportif à valider',
      coalesce(v_title,new.challenge_id),new.user_id,'sport_challenge',new.challenge_id,
      jsonb_build_object('user_id',new.user_id,'progress',new.progress)
    );
  elsif new.status='verified' then
    perform member_private.enqueue_member_notification(
      new.user_id,'sport.verified:'||new.challenge_id,'sport.challenge.verified','important',
      'Défi 3B validé',coalesce(v_title,new.challenge_id)||' a été validé.','sport',
      jsonb_build_object('challenge_id',new.challenge_id)
    );
  elsif old.status='submitted' and new.status='eligible' then
    perform member_private.enqueue_member_notification(
      new.user_id,'sport.rejected:'||new.challenge_id||':'||extract(epoch from new.updated_at)::bigint::text,
      'sport.challenge.review','important','Défi à compléter',
      coalesce(new.moderator_note,'La validation demande une précision supplémentaire.'),'sport',
      jsonb_build_object('challenge_id',new.challenge_id)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_sport_entry() from public,anon,authenticated;
drop trigger if exists notification_sport_entry_events on public.sport_challenge_entries;
create trigger notification_sport_entry_events
after update of status on public.sport_challenge_entries
for each row execute function member_private.notify_sport_entry();

create or replace function member_private.notify_shop_order() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform member_private.enqueue_owner_event(
      'shop.order:'||new.stripe_session_id,'shop','shop.order.paid','important',
      'Nouvelle commande payée','Une nouvelle commande boutique est prête à être traitée.',
      new.loyalty_user_id,'shop_order',new.stripe_session_id,
      jsonb_build_object('amount_total',new.amount_total,'currency',new.currency,'fulfillment_status',new.fulfillment_status)
    );
    if new.loyalty_user_id is not null then
      perform member_private.enqueue_member_notification(
        new.loyalty_user_id,'shop.paid:'||new.stripe_session_id,'shop.order.paid','important',
        'Paiement confirmé','Ta commande 3B a bien été enregistrée.','shop',
        jsonb_build_object('session_id',new.stripe_session_id)
      );
    end if;
  elsif new.fulfillment_status is distinct from old.fulfillment_status then
    perform member_private.enqueue_owner_event(
      'shop.status:'||new.stripe_session_id||':'||new.fulfillment_status,'shop','shop.order.'||new.fulfillment_status,
      case when new.fulfillment_status in ('cancelled','refunded') then 'urgent' else 'info' end,
      'Commande · '||new.fulfillment_status,'Le statut d’une commande a changé.',
      new.loyalty_user_id,'shop_order',new.stripe_session_id,
      jsonb_build_object('from',old.fulfillment_status,'to',new.fulfillment_status)
    );
    if new.loyalty_user_id is not null then
      perform member_private.enqueue_member_notification(
        new.loyalty_user_id,'shop.status:'||new.stripe_session_id||':'||new.fulfillment_status,
        'shop.order.'||new.fulfillment_status,
        case when new.fulfillment_status in ('cancelled','refunded') then 'important' else 'info' end,
        'Commande 3B mise à jour','Nouveau statut : '||new.fulfillment_status||'.','shop',
        jsonb_build_object('session_id',new.stripe_session_id,'status',new.fulfillment_status)
      );
    end if;
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_shop_order() from public,anon,authenticated;
drop trigger if exists notification_shop_order_events on public.shop_orders;
create trigger notification_shop_order_events
after insert or update of fulfillment_status on public.shop_orders
for each row execute function member_private.notify_shop_order();

create or replace function member_private.notify_shop_delivery_failure() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.state='failed' and (tg_op='INSERT' or old.state is distinct from new.state) then
    perform member_private.enqueue_owner_event(
      'shop.notification.failed:'||new.stripe_session_id||':'||new.event||':'||new.channel,
      'shop','shop.notification.failed','urgent','Notification boutique échouée',
      'Une notification '||new.channel||' n’a pas pu être envoyée.',null,'shop_order',new.stripe_session_id,
      jsonb_build_object('event',new.event,'channel',new.channel,'attempts',new.attempts)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_shop_delivery_failure() from public,anon,authenticated;
drop trigger if exists owner_shop_notification_failures on public.shop_notification_log;
create trigger owner_shop_notification_failures
after insert or update of state on public.shop_notification_log
for each row execute function member_private.notify_shop_delivery_failure();

create or replace function member_private.notify_trade_offer() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' and new.status='pending' and new.recipient_id is not null then
    perform member_private.enqueue_member_notification(
      new.recipient_id,'trade.received:'||new.id::text,'marketplace.trade.received','important',
      'Nouvelle proposition d’échange','Un membre 3B te propose un échange.','member',
      jsonb_build_object('trade_id',new.id)
    );
  elsif tg_op='UPDATE' and new.status is distinct from old.status then
    if new.proposer_id is not null then
      perform member_private.enqueue_member_notification(
        new.proposer_id,'trade.status:'||new.id::text||':'||new.status,'marketplace.trade.'||new.status,'info',
        'Échange 3B mis à jour','Statut : '||new.status||'.','member',jsonb_build_object('trade_id',new.id)
      );
    end if;
    if new.recipient_id is not null then
      perform member_private.enqueue_member_notification(
        new.recipient_id,'trade.status-recipient:'||new.id::text||':'||new.status,'marketplace.trade.'||new.status,'info',
        'Échange 3B mis à jour','Statut : '||new.status||'.','member',jsonb_build_object('trade_id',new.id)
      );
    end if;
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_trade_offer() from public,anon,authenticated;
drop trigger if exists notification_trade_offer_events on public.trade_offers;
create trigger notification_trade_offer_events
after insert or update of status on public.trade_offers
for each row execute function member_private.notify_trade_offer();

create or replace function member_private.notify_secret_winner() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    perform member_private.enqueue_owner_event(
      'secret3b.winner:'||new.attempt_id::text,'secret3b','secret3b.winner','important',
      'Nouveau gagnant Secret 3B','Un gagnant a été enregistré. Rang '||new.winner_rank::text||'.',
      null,'secret3b_winner',new.attempt_id::text,jsonb_build_object('rank',new.winner_rank)
    );
  elsif new.claimed_at is not null and old.claimed_at is null then
    perform member_private.enqueue_owner_event(
      'secret3b.claimed:'||new.attempt_id::text,'secret3b','secret3b.prize_claimed','important',
      'Lot Secret 3B réclamé','Un gagnant a transmis ses informations de remise.',
      new.claimed_by,'secret3b_winner',new.attempt_id::text,jsonb_build_object('rank',new.winner_rank)
    );
    if new.claimed_by is not null then
      perform member_private.enqueue_member_notification(
        new.claimed_by,'secret3b.claimed:'||new.attempt_id::text,'secret3b.prize_claimed','important',
        'Réclamation enregistrée','Ta demande de lot Secret 3B a bien été enregistrée.','secret',
        jsonb_build_object('rank',new.winner_rank)
      );
    end if;
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_secret_winner() from public,anon,authenticated;
drop trigger if exists notification_secret_winner_events on public.secret3b_phone_winners;
create trigger notification_secret_winner_events
after insert or update of claimed_at on public.secret3b_phone_winners
for each row execute function member_private.notify_secret_winner();


create or replace function member_private.notify_auth_security() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_failures integer;
begin
  if new.success then
    if new.user_id is not null and new.event_type in ('recover.success','recovery.success','reset.password.success','password.changed') then
      perform member_private.enqueue_member_notification(
        new.user_id,'security.auth:'||new.id::text,'security.account_change','important',
        'Sécurité du compte mise à jour','Une opération sensible de récupération ou de mot de passe a été effectuée sur ton compte.','notifications',
        jsonb_build_object('event_type',new.event_type)
      );
    end if;
    return new;
  end if;

  if new.ip_hash is null then return new; end if;
  select count(*) into v_failures
  from public.member_auth_events
  where ip_hash=new.ip_hash and success=false and created_at>=now()-interval '15 minutes';

  if v_failures in (5,10,20) then
    perform member_private.enqueue_owner_event(
      'security.auth_failures:'||new.ip_hash||':'||to_char(now() at time zone 'UTC','YYYYMMDDHH24MI'),
      'security','security.auth.repeated_failures',
      case when v_failures>=20 then 'critical' when v_failures>=10 then 'urgent' else 'important' end,
      'Échecs d’authentification répétés',
      v_failures::text||' échecs ont été observés sur une fenêtre de 15 minutes.',
      new.user_id,'auth_event',new.id::text,
      jsonb_build_object('count',v_failures,'event_type',new.event_type)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_auth_security() from public,anon,authenticated;
drop trigger if exists owner_auth_security_events on public.member_auth_events;
create trigger owner_auth_security_events
after insert on public.member_auth_events
for each row execute function member_private.notify_auth_security();

create or replace function member_private.notify_economy_risk() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_tier text; v_old smallint:=0;
begin
  if not new.review_required then return new; end if;
  if tg_op='UPDATE' then v_old:=coalesce(old.risk_score,0); end if;
  v_tier:=case when new.risk_score>=90 then 'critical' when new.risk_score>=75 then 'high' when new.risk_score>=50 then 'medium' else 'review' end;
  if tg_op='INSERT' or (tg_op='UPDATE' and (
    old.review_required=false or
    (v_old<50 and new.risk_score>=50) or
    (v_old<75 and new.risk_score>=75) or
    (v_old<90 and new.risk_score>=90)
  )) then
    perform member_private.enqueue_owner_event(
      'economy.risk:'||new.user_id::text||':'||v_tier||':'||to_char(now() at time zone 'UTC','YYYYMMDD'),
      'security','economy.risk.review',
      case when new.risk_score>=90 then 'critical' when new.risk_score>=75 then 'urgent' else 'important' end,
      'Anomalie économique à vérifier',
      'Le profil de risque d’un membre demande une revue.',
      new.user_id,'economy_risk',new.user_id::text,
      jsonb_build_object('risk_score',new.risk_score,'signal',new.last_signal,'tier',v_tier)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_economy_risk() from public,anon,authenticated;
drop trigger if exists owner_economy_risk_events on public.threeb_economy_risk_profiles;
create trigger owner_economy_risk_events
after insert or update of risk_score,review_required on public.threeb_economy_risk_profiles
for each row execute function member_private.notify_economy_risk();

create or replace function member_private.notify_reward_outbox() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if new.status='rejected' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform member_private.enqueue_owner_event(
      'reward.rejected:'||new.id::text,'system','reward.delivery.rejected','urgent',
      'Récompense 3B non distribuée','Une récompense n’a pas pu être créditée.',
      new.user_id,'reward_outbox',new.id::text,
      jsonb_build_object('reward_code',new.reward_code,'source',new.source,'attempts',new.attempts)
    );
    perform member_private.enqueue_member_notification(
      new.user_id,'reward.rejected:'||new.id::text,'reward.delivery.rejected','important',
      'Récompense en vérification','Une récompense 3B n’a pas pu être créditée automatiquement et nécessite une vérification.','notifications',
      jsonb_build_object('reward_code',new.reward_code)
    );
  elsif new.status='pending' and new.attempts>=5 and (tg_op='INSERT' or coalesce(old.attempts,0)<5) then
    perform member_private.enqueue_owner_event(
      'reward.retry:'||new.id::text,'system','reward.delivery.retries','important',
      'Récompense en attente','Une récompense reste en attente après plusieurs tentatives.',
      new.user_id,'reward_outbox',new.id::text,
      jsonb_build_object('reward_code',new.reward_code,'source',new.source,'attempts',new.attempts)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_reward_outbox() from public,anon,authenticated;
drop trigger if exists notification_reward_outbox_events on public.threeb_reward_outbox;
create trigger notification_reward_outbox_events
after insert or update of status,attempts on public.threeb_reward_outbox
for each row execute function member_private.notify_reward_outbox();


create or replace function member_private.notify_community_like() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_author uuid; v_title text;
begin
  select author_id,title into v_author,v_title from public.community_posts where id=new.post_id;
  if v_author is null or v_author=new.user_id then return new; end if;
  perform member_private.enqueue_member_notification(
    v_author,
    'community.like:'||new.post_id::text||':'||to_char(now() at time zone 'UTC','YYYYMMDD'),
    'community.post.votes','info','Ta publication reçoit des votes',
    left(coalesce(v_title,'Une publication')||' reçoit de nouveaux votes aujourd’hui.',1500),
    'community',jsonb_build_object('post_id',new.post_id)
  );
  return new;
end
$$;
revoke all on function member_private.notify_community_like() from public,anon,authenticated;
drop trigger if exists notification_community_like_events on public.community_likes;
create trigger notification_community_like_events
after insert on public.community_likes
for each row execute function member_private.notify_community_like();

create or replace function member_private.notify_community_follow() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_handle text;
begin
  select handle into v_handle from public.member_profiles where user_id=new.user_id;
  perform member_private.enqueue_member_notification(
    new.target_id,'community.follow:'||new.target_id::text||':'||new.user_id::text,
    'community.follow','info','Nouveau suivi dans le collectif',
    '@'||coalesce(v_handle,'membre-3b')||' suit maintenant ton profil.','community',
    jsonb_build_object('follower_id',new.user_id)
  );
  return new;
end
$$;
revoke all on function member_private.notify_community_follow() from public,anon,authenticated;
drop trigger if exists notification_community_follow_events on public.community_follows;
create trigger notification_community_follow_events
after insert on public.community_follows
for each row execute function member_private.notify_community_follow();

create or replace function member_private.notify_hidden_community_content() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_author uuid; v_kind text;
begin
  if new.status is not distinct from old.status or new.status<>'hidden' then return new; end if;
  if tg_table_name='community_posts' then
    v_id:=new.id;v_author:=new.author_id;v_kind:='publication';
  else
    v_id:=new.id;v_author:=new.author_id;v_kind:='message';
  end if;
  perform member_private.enqueue_member_notification(
    v_author,'community.hidden:'||v_id::text,'moderation.content_hidden','important',
    'Contenu masqué par la modération',
    'Un '||v_kind||' a été masqué après vérification. Consulte les règles du collectif avant de republier.',
    'community',jsonb_build_object('content_id',v_id,'kind',v_kind)
  );
  return new;
end
$$;
revoke all on function member_private.notify_hidden_community_content() from public,anon,authenticated;
drop trigger if exists notification_hidden_post_events on public.community_posts;
create trigger notification_hidden_post_events
after update of status on public.community_posts
for each row execute function member_private.notify_hidden_community_content();
drop trigger if exists notification_hidden_chat_events on public.community_chat;
create trigger notification_hidden_chat_events
after update of status on public.community_chat
for each row execute function member_private.notify_hidden_community_content();

create or replace function member_private.notify_repeated_blocks() returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_count integer;
begin
  select count(*) into v_count from public.community_blocks where target_id=new.target_id;
  if v_count in (3,5,10) then
    perform member_private.enqueue_owner_event(
      'community.blocks:'||new.target_id::text||':'||v_count::text,
      'moderation','community.member.repeated_blocks',
      case when v_count>=10 then 'urgent' else 'important' end,
      'Membre bloqué à plusieurs reprises',
      v_count::text||' membres bloquent actuellement ce profil.',
      new.target_id,'member',new.target_id::text,jsonb_build_object('block_count',v_count)
    );
  end if;
  return new;
end
$$;
revoke all on function member_private.notify_repeated_blocks() from public,anon,authenticated;
drop trigger if exists owner_repeated_block_events on public.community_blocks;
create trigger owner_repeated_block_events
after insert on public.community_blocks
for each row execute function member_private.notify_repeated_blocks();

commit;
