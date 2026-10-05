-- =====================================================================
-- Universidade Rottas — logo editável pelo admin (também vira o ícone da aba)
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- =====================================================================

-- vazio = usa a logo padrão do site (public/logo.png)
insert into public.config (chave, valor) values ('logo_url', '')
on conflict (chave) do nothing;

-- a logo aparece até na tela de login, então pode ser lida sem estar logado
drop policy if exists config_ler_publico on public.config;
create policy config_ler_publico on public.config for select to anon, authenticated
  using (chave in ('logo_url'));
grant select on public.config to anon, authenticated;
grant insert, update on public.config to authenticated;   -- só admin consegue de fato (regra config_admin)
