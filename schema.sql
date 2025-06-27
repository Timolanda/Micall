-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- Users table (Supabase Auth users are in auth.users, but you can extend with a profile)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('victim', 'responder', 'contact')),
  photo_url text,
  medical_info text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Emergency contacts (up to 5 per user)
create table contacts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  relationship text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint unique_user_phone unique (user_id, phone)
);

-- Emergency alerts (matches our current implementation)
create table emergency_alerts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null, -- 'SOS', 'video', 'Go Live', etc.
  message text,
  lat double precision,
  lng double precision,
  video_url text, -- URL to uploaded video
  status text default 'active', -- 'active', 'resolved', 'cancelled'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Responders (real-time location with PostGIS)
create table responders (
  id uuid primary key references profiles(id) on delete cascade,
  lat double precision,
  lng double precision,
  location geometry(Point, 4326), -- PostGIS point for efficient distance queries
  available boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Notifications for in-app alerts
create table notifications (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  type text not null, -- 'emergency', 'info', 'warning'
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Emergency history
create table history (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  outcome text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Stripe subscriptions (optional)
create table subscriptions (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Video uploads (reference to Supabase Storage)
create table videos (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references emergency_alerts(id) on delete cascade,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexes for performance
create index idx_contacts_user_id on contacts(user_id);
create index idx_emergency_alerts_user_id on emergency_alerts(user_id);
create index idx_emergency_alerts_created_at on emergency_alerts(created_at desc);
create index idx_responders_location on responders using gist(location);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_read on notifications(read);

-- Function to get nearby responders (within radius in km)
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
      radius_km * 1000  -- Convert km to meters
    );
$$;

-- Trigger to update PostGIS location when lat/lng changes
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

-- Row Level Security (RLS) policies
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table emergency_alerts enable row level security;
alter table responders enable row level security;
alter table notifications enable row level security;
alter table history enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Contacts policies
create policy "Users can manage own contacts" on contacts
  for all using (auth.uid() = user_id);

-- Emergency alerts policies
create policy "Users can create own alerts" on emergency_alerts
  for insert with check (auth.uid() = user_id);

create policy "Users can view own alerts" on emergency_alerts
  for select using (auth.uid() = user_id);

create policy "Responders can view nearby alerts" on emergency_alerts
  for select using (
    exists (
      select 1 from responders r 
      where r.id = auth.uid() 
        and r.available = true
    )
  );

-- Responders policies
create policy "Responders can update own location" on responders
  for update using (auth.uid() = id);

create policy "Anyone can view available responders" on responders
  for select using (available = true);

-- Notifications policies
create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- Storage policies for videos bucket
-- Note: You need to create the 'videos' bucket in Supabase Storage UI first
insert into storage.buckets (id, name, public) 
values ('videos', 'videos', false) 
on conflict (id) do nothing;

create policy "Allow authenticated upload to videos" on storage.objects
  for insert with check (bucket_id = 'videos' and auth.role() = 'authenticated');

create policy "Allow authenticated read from videos" on storage.objects
  for select using (bucket_id = 'videos' and auth.role() = 'authenticated');

create policy "Allow authenticated delete from videos" on storage.objects
  for delete using (bucket_id = 'videos' and auth.role() = 'authenticated');

