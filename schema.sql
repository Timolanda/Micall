-- Users table (Supabase Auth users are in auth.users, but you can extend with a profile)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('victim', 'responder', 'contact')),
  photo_url text,
  medical_info text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Emergency contacts
create table contacts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text,
  phone text,
  email text,
  relationship text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Emergency alerts
create table alerts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text, -- 'SOS', 'Go Live', etc.
  message text,
  lat double precision,
  lng double precision,
  status text, -- 'active', 'resolved', etc.
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Responders (real-time location)
create table responders (
  id uuid primary key references profiles(id) on delete cascade,
  lat double precision,
  lng double precision,
  available boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Emergency history
create table history (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  alert_id bigint references alerts(id) on delete cascade,
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
  alert_id bigint references alerts(id) on delete cascade,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
