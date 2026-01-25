alter table public.projects
add column if not exists profile_image_url text;

comment on column public.projects.profile_image_url is
  'URL de la foto de perfil/logo del proyecto.';
