-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- ============================================================================
-- PROFILES TABLE (Enhanced with name + phone + admin roles)
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text check (role in ('victim', 'responder', 'contact', 'admin', 'hospital', 'police', 'fire')),
  photo_url text,
  medical_info text,
  location_sharing_enabled boolean default false,
  location_sharing_updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_created_at on profiles(created_at desc);

-- ============================================================================
-- EMERGENCY ALERTS TABLE
-- ============================================================================
create table emergency_alerts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('SOS', 'video', 'Go Live', 'other')),
  message text,
  lat double precision,
  lng double precision,
  video_url text,
  status text default 'active' check (status in ('active', 'ended', 'resolved', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_emergency_alerts_user_id on emergency_alerts(user_id);
create index idx_emergency_alerts_status on emergency_alerts(status);
create index idx_emergency_alerts_created_at on emergency_alerts(created_at desc);
create index idx_emergency_alerts_coords on emergency_alerts(lat, lng);

-- ============================================================================
-- RESPONDERS TABLE (Presence tracking - separate from alerts)
-- ============================================================================
create table responders (
  id uuid primary key references profiles(id) on delete cascade,
  lat double precision,
  lng double precision,
  location geometry(Point, 4326),
  available boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint check_location_data check (
    (lat is null and lng is null and location is null)
    or (lat is not null and lng is not null and location is not null)
  )
);

create index idx_responders_available on responders(available);
create index idx_responders_location on responders using gist(location);
create index idx_responders_updated_at on responders(updated_at desc);
create index idx_responders_available_updated on responders(available, updated_at desc);

-- ============================================================================
-- LIVE RESPONDERS TABLE (Track active responders per alert)
-- ============================================================================
create table live_responders (
  id bigserial primary key,
  alert_id bigint not null references emergency_alerts(id) on delete cascade,
  responder_id uuid not null references profiles(id) on delete cascade,
  lat double precision,
  lng double precision,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_responder_alert unique(alert_id, responder_id)
);

create index idx_live_responders_alert_id on live_responders(alert_id);
create index idx_live_responders_responder_id on live_responders(responder_id);

-- ============================================================================
-- USER LOCATIONS TABLE
-- ============================================================================
create table user_locations (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id)
);

create index idx_user_locations_user_id on user_locations(user_id);
create index idx_user_locations_updated_at on user_locations(updated_at desc);
create index idx_user_locations_updated on user_locations(user_id, updated_at desc);

-- ============================================================================
-- EMERGENCY CONTACTS TABLE
-- ============================================================================
create table contacts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  relationship text,
  can_view_location boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_user_phone unique (user_id, phone),
  constraint max_contacts_per_user check (
    (select count(*) from contacts c2 where c2.user_id = user_id) <= 5
  )
);

create index idx_contacts_user_id on contacts(user_id);

-- ============================================================================
-- LOCATION SHARING PERMISSIONS TABLE
-- ============================================================================
create table location_sharing_permissions (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  contact_id bigint references contacts(id) on delete cascade,
  can_view boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_user_contact unique (user_id, contact_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
create table notifications (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  type text not null check (type in ('emergency', 'info', 'warning', 'success')),
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read on notifications(read);

-- ============================================================================
-- HISTORY TABLE
-- ============================================================================
create table history (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  outcome text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_history_user_id on history(user_id);

-- ============================================================================
-- WEBRTC SIGNALS TABLE (Peer-to-peer streaming)
-- ============================================================================
create table webrtc_signals (
  id bigserial primary key,
  alert_id bigint not null references emergency_alerts(id) on delete cascade,
  type text not null check (type in ('offer', 'answer', 'ice')),
  payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_webrtc_signals_alert_id on webrtc_signals(alert_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
create table subscriptions (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
create table videos (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================================================
-- POSTGRES FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update PostGIS location when lat/lng changes
create or replace function update_responder_location()
returns trigger as $$
begin
  if NEW.lat is not null and NEW.lng is not null then
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_responder_location
  before insert or update on responders
  for each row
  execute function update_responder_location();

-- Update timestamp on profile changes
create or replace function update_profiles_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_profiles_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - ENABLED
-- ============================================================================

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table emergency_alerts enable row level security;
alter table responders enable row level security;
alter table live_responders enable row level security;
alter table user_locations enable row level security;
alter table notifications enable row level security;
alter table history enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table webrtc_signals enable row level security;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- EMERGENCY ALERTS POLICIES
-- ============================================================================

create policy "Users can create own alerts" on emergency_alerts
  for insert with check (auth.uid() = user_id);

create policy "Users can view own alerts" on emergency_alerts
  for select using (auth.uid() = user_id);

create policy "Users can update own alerts" on emergency_alerts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Responders can view active alerts" on emergency_alerts
  for select using (
    status = 'active'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('responder', 'admin', 'hospital', 'police', 'fire')
    )
  );

create policy "Admins can view all alerts" on emergency_alerts
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- RESPONDERS POLICIES (Critical for presence)
-- ============================================================================

create policy "Responders can insert own presence" on responders
  for insert with check (auth.uid() = id);

create policy "Responders can update own location" on responders
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Anyone can view available responders" on responders
  for select using (available = true);

create policy "Admins can view all responders" on responders
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- LIVE RESPONDERS POLICIES
-- ============================================================================

create policy "Responders can join live alerts" on live_responders
  for insert with check (auth.uid() = responder_id);

create policy "Users can view responders on their alerts" on live_responders
  for select using (
    exists (
      select 1 from emergency_alerts ea
      where ea.id = alert_id
      and (
        ea.user_id = auth.uid()
        or exists (
          select 1 from live_responders lr
          where lr.alert_id = alert_id
          and lr.responder_id = auth.uid()
        )
      )
    )
  );

create policy "Admins can view all live responders" on live_responders
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- USER LOCATIONS POLICIES
-- ============================================================================

create policy "Users can manage own location" on user_locations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Responders can view active emergency locations" on user_locations
  for select using (
    exists (
      select 1 from emergency_alerts ea
      where ea.user_id = user_locations.user_id
      and ea.status = 'active'
      and exists (
        select 1 from profiles p
        where p.id = auth.uid()
        and p.role in ('responder', 'admin', 'hospital', 'police', 'fire')
      )
    )
  );

-- ============================================================================
-- CONTACTS POLICIES
-- ============================================================================

create policy "Users can manage own contacts" on contacts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- HISTORY POLICIES
-- ============================================================================

create policy "Users can view own history" on history
  for select using (auth.uid() = user_id);

create policy "Admins can view all history" on history
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

-- ============================================================================
-- WEBRTC SIGNALS POLICIES
-- ============================================================================

create policy "Users can create and view signals for their alerts" on webrtc_signals
  for all using (
    exists (
      select 1 from emergency_alerts ea
      where ea.id = alert_id
      and (
        ea.user_id = auth.uid()
        or exists (
          select 1 from live_responders lr
          where lr.alert_id = alert_id
          and lr.responder_id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

create policy "Users can view own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- ============================================================================
-- VIDEOS POLICIES
-- ============================================================================

create policy "Users can manage own videos" on videos
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public) 
values ('evidence', 'evidence', false) 
on conflict (id) do nothing;

create policy "Authenticated users can upload evidence" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence');

create policy "Users can view their own evidence" on storage.objects
  for select using (
    bucket_id = 'evidence' and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from profiles p
        where p.id = auth.uid()
        and p.role in ('admin', 'hospital', 'police', 'fire')
      )
    )
  );

-- Videos bucket
insert into storage.buckets (id, name, public) 
values ('videos', 'videos', false) 
on conflict (id) do nothing;

create policy "Authenticated upload to videos" on storage.objects
  for insert with check (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated read from videos" on storage.objects
  for select using (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get nearby responders (within radius in km)
create or replace function get_nearby_responders(
  lat double precision,
  lng double precision,
  radius_km double precision
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  available boolean
)
language sql
as $$
  select 
    r.id,
    r.lat,
    r.lng,
    r.available
  from responders r
  where r.available = true
    and ST_DWithin(
      ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326),
      ST_SetSRID(ST_MakePoint(lng, lat), 4326),
      radius_km * 1000
    );
$$;

-- Get nearby alerts (within radius in km)
create or replace function get_nearby_alerts(
  lat double precision,
  lng double precision,
  radius_km double precision
)
returns setof emergency_alerts
language sql
as $$
  select *
  from emergency_alerts a
  where a.status = 'active'
    and a.lat is not null
    and a.lng is not null
    and ST_DWithin(
      ST_SetSRID(ST_MakePoint(a.lng, a.lat), 4326),
      ST_SetSRID(ST_MakePoint(lng, lat), 4326),
      radius_km * 1000
    )
  order by a.created_at desc;
$$;

-- ============================================================================
-- NOTIFICATION SETTINGS TABLE
-- ============================================================================
create table notification_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references profiles(id) on delete cascade unique,
  receive_all_notifications boolean default true,
  notify_police boolean default true,
  notify_fire boolean default true,
  notify_medical boolean default true,
  notify_rescue boolean default true,
  alert_radius_km integer default 5 check (alert_radius_km >= 1 and alert_radius_km <= 50),
  enable_sound boolean default true,
  enable_vibration boolean default true,
  enable_popup boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_notification_settings_user_id on notification_settings(user_id);

-- RLS for notification settings
alter table notification_settings enable row level security;

create policy "Users can view their own notification settings" on notification_settings
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own notification settings" on notification_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can create their own notification settings" on notification_settings
  for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATION SUBSCRIPTIONS TABLE (Web Push subscriptions)
-- ============================================================================
create table notification_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references profiles(id) on delete cascade unique,
  subscription_data jsonb not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_notification_subscriptions_user_id on notification_subscriptions(user_id);
create index idx_notification_subscriptions_is_active on notification_subscriptions(is_active);

-- RLS for subscriptions
alter table notification_subscriptions enable row level security;

create policy "Users can view their own subscriptions" on notification_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "Users can create subscriptions" on notification_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions" on notification_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can manage all subscriptions
create policy "Service role can manage subscriptions" on notification_subscriptions
  for all
  using (auth.role() = 'service_role');

-- ============================================================================
-- NOTIFICATION LOGS TABLE (For analytics)
-- ============================================================================
create table notification_logs (
  id uuid default uuid_generate_v4() primary key,
  emergency_id bigint references emergency_alerts(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'emergency_alert',
    'location_based',
    'responder_type',
    'general'
  )),
  recipient_count integer default 0,
  sent_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_notification_logs_emergency_id on notification_logs(emergency_id);
create index idx_notification_logs_notification_type on notification_logs(notification_type);
create index idx_notification_logs_sent_at on notification_logs(sent_at desc);

-- RLS for logs
alter table notification_logs enable row level security;

create policy "Admins can view notification logs" on notification_logs
  for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'hospital', 'police', 'fire')
    )
  );

create policy "Service role can insert notification logs" on notification_logs
  for insert
  with check (auth.role() = 'service_role');

-- ============================================================================
-- RESPONDER PRESENCE TABLE (Track who's actively viewing which alert)
-- ============================================================================
create table responder_presence (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  alert_id bigint not null references emergency_alerts(id) on delete cascade,
  user_type text not null check (user_type in ('victim', 'responder')),
  lat double precision,
  lng double precision,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_user_alert unique(user_id, alert_id)
);

create index idx_responder_presence_alert_id on responder_presence(alert_id);
create index idx_responder_presence_user_id on responder_presence(user_id);
create index idx_responder_presence_user_type on responder_presence(user_type);
create index idx_responder_presence_joined_at on responder_presence(joined_at desc);
create index idx_responder_presence_alert_user_type on responder_presence(alert_id, user_type);

-- RLS: Responder Presence
alter table responder_presence enable row level security;

create policy "Users can view presence on their own alerts" on responder_presence
  for select to authenticated
  using (
    -- Can view presence if you're the victim of this alert
    exists (
      select 1 from emergency_alerts ea
      where ea.id = alert_id
      and ea.user_id = auth.uid()
    )
    or
    -- Or if you're a responder viewing this alert
    exists (
      select 1 from responder_presence rp
      where rp.alert_id = alert_id
      and rp.user_id = auth.uid()
      and rp.user_type = 'responder'
    )
  );

create policy "Users can insert own presence" on responder_presence
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own presence" on responder_presence
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own presence" on responder_presence
  for delete to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all presence" on responder_presence
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'hospital', 'police', 'fire')
    )
  );

create policy "Service role can manage presence" on responder_presence
  for all to service_role
  with check (true);

-- ============================================================================
-- PROFILES BUCKET (For avatar uploads)
-- ============================================================================
insert into storage.buckets (id, name, public) 
values ('profiles', 'profiles', true) 
on conflict (id) do nothing;

create policy "Authenticated users can upload to profiles" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view profile pictures" on storage.objects
  for select
  using (bucket_id = 'profiles');

create policy "Users can update their own profile pictures" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own profile pictures" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- USER INVITES TABLE (Safety Circle Referral System)
-- ============================================================================
create table user_invites (
  id bigserial primary key,
  inviter_user_id uuid not null references profiles(id) on delete cascade,
  invite_code varchar(32) unique not null,
  invitee_email varchar(255),
  status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '7 days'),
  accepted_by_user_id uuid references profiles(id) on delete set null,
  accepted_at timestamp with time zone,
  metadata jsonb default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_user_invites_inviter on user_invites(inviter_user_id);
create index idx_user_invites_code on user_invites(invite_code);
create index idx_user_invites_status on user_invites(status);
create index idx_user_invites_created_at on user_invites(created_at desc);

-- RLS: User Invites
alter table user_invites enable row level security;

create policy "Users can view their own invites sent" on user_invites
  for select to authenticated
  using (auth.uid() = inviter_user_id);

create policy "Users can view invites sent to them (by email)" on user_invites
  for select to authenticated
  using (
    invitee_email = (select email from auth.users where id = auth.uid())
    or accepted_by_user_id = auth.uid()
  );

create policy "Authenticated users can create invites" on user_invites
  for insert to authenticated
  with check (auth.uid() = inviter_user_id);

create policy "Users can update their own sent invites" on user_invites
  for update to authenticated
  using (auth.uid() = inviter_user_id);

create policy "Users can accept invites sent to them" on user_invites
  for update to authenticated
  using (
    invitee_email = (select email from auth.users where id = auth.uid())
    and status = 'pending'
  );

create policy "Service role can manage invites" on user_invites
  for all to service_role
  with check (true);

