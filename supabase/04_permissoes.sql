-- =====================================================================
-- Universidade Rottas — correção: o app não consegue LER as tabelas
-- (perfil existe no banco, mas o site diz "não encontrei o seu perfil")
-- Causa: as tabelas foram criadas sem permissão de leitura para usuários logados.
-- As regras de segurança (RLS) continuam valendo: cada um só vê/edita o que pode.
-- Pode rodar mais de uma vez.
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- tabelas criadas no futuro já nascem com a permissão
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

-- confira: deve listar SELECT/INSERT/UPDATE/DELETE para "authenticated"
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as permissoes
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles' and grantee in ('anon', 'authenticated')
group by grantee;
