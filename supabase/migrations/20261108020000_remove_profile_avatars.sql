drop policy if exists "Users can read their own profile photo" on storage.objects;
drop policy if exists "Users can upload their own profile photo" on storage.objects;
drop policy if exists "Users can update their own profile photo" on storage.objects;
drop policy if exists "Users can delete their own profile photo" on storage.objects;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'avatar_path'
where raw_user_meta_data ? 'avatar_path';
