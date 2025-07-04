insert into public.profiles (id, full_name, role, photo_url)
select
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'role',
  u.raw_user_meta_data->>'photo_url'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
