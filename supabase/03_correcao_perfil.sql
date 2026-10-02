-- =====================================================================
-- Universidade Rottas — correção: perfil não criado / sem setor / sem admin
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- Se aparecer "relation public.profiles does not exist", rode antes o 01_schema.sql.
-- =====================================================================

-- 1) setor inicial
insert into public.setores (nome, ordem) values ('Excelência Operacional', 0)
on conflict (nome) do nothing;

-- 2) função que o app chama para criar o perfil caso ele não exista
create or replace function public.garantir_perfil() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email  text := lower((select email from auth.users where id = auth.uid()));
  v_dominio text := (select valor from public.config where chave = 'dominio_permitido');
  v_admins text := coalesce((select valor from public.config where chave = 'admins_iniciais'), '');
begin
  if auth.uid() is null or v_email is null then return; end if;
  if v_dominio is not null and v_email not like '%@' || v_dominio then
    raise exception 'Use seu e-mail @%', v_dominio;
  end if;
  insert into public.profiles (id, email, nome, is_admin)
  values (auth.uid(), v_email, initcap(replace(split_part(v_email, '@', 1), '.', ' ')),
          v_email = any (string_to_array(replace(lower(v_admins), ' ', ''), ',')))
  on conflict (id) do nothing;
end $$;
revoke execute on function public.garantir_perfil() from public, anon;
grant execute on function public.garantir_perfil() to authenticated;

-- 3) cria o perfil de quem já entrou antes do banco estar pronto
insert into public.profiles (id, email, nome, is_admin)
select u.id, lower(u.email), initcap(replace(split_part(lower(u.email), '@', 1), '.', ' ')),
       lower(u.email) = any (string_to_array(replace(lower(coalesce((select valor from public.config where chave = 'admins_iniciais'), '')), ' ', ''), ','))
from auth.users u
where u.email is not null and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 4) Rodrigo: admin e setor Excelência Operacional
update public.profiles
set is_admin = true,
    setor_id = coalesce(setor_id, (select id from public.setores where nome = 'Excelência Operacional'))
where email = 'rodrigo.machado@rottasconstrutora.com.br';

-- 5) confira o resultado (deve aparecer seu e-mail com is_admin = true)
select p.email, p.nome, s.nome as setor, p.is_admin
from public.profiles p left join public.setores s on s.id = p.setor_id
order by p.created_at;
