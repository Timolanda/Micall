-- Add dark_mode_enabled column to profiles table (if not exists)
-- This migration enables the fully functional dark mode toggle

alter table profiles
add column if not exists dark_mode_enabled boolean default true;

-- Create index for faster queries
create index if not exists idx_profiles_dark_mode on profiles(dark_mode_enabled);

select 'dark_mode_enabled column added successfully' as status;
