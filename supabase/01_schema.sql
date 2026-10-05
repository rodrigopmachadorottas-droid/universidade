-- =====================================================================
-- Universidade Rottas — estrutura do banco (rodar 1x no SQL Editor do Supabase)
-- Ordem: 01_schema.sql  ->  02_seed.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- configuração ----------
create table if not exists public.config (
  chave text primary key,
  valor text not null
);
insert into public.config (chave, valor) values
  ('dominio_permitido', 'rottasconstrutora.com.br'),
  -- e-mails que já entram como administradores (separados por vírgula)
  ('admins_iniciais', 'rodrigo.machado@rottasconstrutora.com.br')
on conflict (chave) do nothing;

-- ---------- setores ----------
create table if not exists public.setores (
  id serial primary key,
  nome text not null unique,
  ordem int not null default 0
);

-- ---------- perfis (1 por usuário do Supabase Auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome text,
  setor_id int references public.setores (id) on delete set null,
  cargo text,
  avatar_url text,
  is_admin boolean not null default false,
  notificacoes jsonb not null default '{"obrigatorio": true, "resposta": true, "semanal": false}',
  created_at timestamptz not null default now()
);

-- é admin? (usada nas regras de segurança)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- cria o perfil quando alguém entra pela 1ª vez; bloqueia e-mails de fora da empresa
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_dominio text := (select valor from public.config where chave = 'dominio_permitido');
  v_admins  text := coalesce((select valor from public.config where chave = 'admins_iniciais'), '');
  v_email   text := lower(new.email);
  v_nome    text;
begin
  if v_dominio is not null and v_email not like '%@' || v_dominio then
    raise exception 'Use seu e-mail @%', v_dominio;
  end if;
  v_nome := initcap(replace(split_part(v_email, '@', 1), '.', ' '));
  insert into public.profiles (id, email, nome, is_admin)
  values (new.id, v_email, v_nome,
          v_email = any (string_to_array(replace(lower(v_admins), ' ', ''), ',')))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- função que o app chama para criar o perfil caso ele não exista
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


-- ninguém (exceto admin) muda o próprio is_admin ou e-mail
create or replace function public.protege_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists protege_profile on public.profiles;
create trigger protege_profile before update on public.profiles
  for each row execute function public.protege_profile();

-- ---------- catálogo ----------
create table if not exists public.trilhas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  cor text not null default '#E07A0B',
  cor2 text not null default '#FF9E2C',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.secoes (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid not null references public.trilhas (id) on delete cascade,
  slug text unique,
  nome text not null,
  descricao text,
  ordem int not null default 0
);

create table if not exists public.conteudos (
  id uuid primary key default gen_random_uuid(),
  secao_id uuid not null references public.secoes (id) on delete restrict,
  titulo text not null,
  tipo text not null default 'video' check (tipo in ('video', 'slides', 'pdf')),
  formato text not null default 'pilula' check (formato in ('pilula', 'treinamento')),
  duracao_min int check (duracao_min is null or duracao_min between 1 and 60),
  paginas int,
  codigo text,
  descricao text,
  tags text[] not null default '{}',
  obrigatorio boolean not null default false,
  publico_setores int[] not null default '{}',   -- vazio = todos os setores
  embed_url text,                                -- endereço do código de incorporação do SharePoint
  arquivo_path text,                             -- PDF no Storage (bucket "arquivos")
  thumb_url text,
  quiz_ativo boolean not null default false,
  quiz_nota_min int not null default 70 check (quiz_nota_min between 0 and 100),
  quiz_sortear int not null default 5 check (quiz_sortear >= 1),
  quiz_tempo_min int not null default 0 check (quiz_tempo_min >= 0),
  quiz_espera_min int not null default 30 check (quiz_espera_min >= 0),
  quiz_gabarito text not null default 'aprovado' check (quiz_gabarito in ('aprovado', 'nunca', 'sempre')),
  duvidas_ativas boolean not null default true,
  publicado boolean not null default true,
  autor text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conteudos_secao_idx on public.conteudos (secao_id);

-- banco de perguntas (a resposta certa NUNCA vai para o navegador do colaborador)
create table if not exists public.perguntas_quiz (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references public.conteudos (id) on delete cascade,
  enunciado text not null,
  alternativas text[] not null check (array_length(alternativas, 1) >= 2),
  correta int not null,
  ordem int not null default 0
);
create index if not exists perguntas_conteudo_idx on public.perguntas_quiz (conteudo_id);

create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references public.conteudos (id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  ordem int not null default 0
);

create table if not exists public.duvidas (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null references public.conteudos (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now(),
  resposta text,
  respondido_por uuid references public.profiles (id) on delete set null,
  respondido_em timestamptz
);

-- ---------- progresso e tentativas ----------
create table if not exists public.progresso (
  user_id uuid not null references public.profiles (id) on delete cascade,
  conteudo_id uuid not null references public.conteudos (id) on delete cascade,
  aberto_em timestamptz not null default now(),
  tempo_seg int not null default 0,
  ultimo_ping timestamptz,
  status text not null default 'aberto' check (status in ('aberto', 'reprovado', 'concluido')),
  nota int,
  tentativas int not null default 0,
  concluido_em timestamptz,
  proxima_tentativa timestamptz,
  primary key (user_id, conteudo_id)
);

create table if not exists public.tentativas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conteudo_id uuid not null references public.conteudos (id) on delete cascade,
  perguntas jsonb not null,          -- [{ "id": uuid, "ordem": [2,0,3,1] }]
  respostas jsonb,
  nota int,
  aprovado boolean,
  iniciada_em timestamptz not null default now(),
  enviada_em timestamptz
);
create index if not exists tentativas_user_idx on public.tentativas (user_id, conteudo_id);

-- permissões de acesso pela API (o RLS abaixo decide o que cada um vê)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- tabelas criadas no futuro já nascem com a permissão
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;


-- =====================================================================
-- Segurança (Row Level Security)
-- =====================================================================
alter table public.config         enable row level security;
alter table public.setores        enable row level security;
alter table public.profiles       enable row level security;
alter table public.trilhas        enable row level security;
alter table public.secoes         enable row level security;
alter table public.conteudos      enable row level security;
alter table public.perguntas_quiz enable row level security;
alter table public.faq            enable row level security;
alter table public.duvidas        enable row level security;
alter table public.progresso      enable row level security;
alter table public.tentativas     enable row level security;

-- config: só admin
drop policy if exists config_admin on public.config;
create policy config_admin on public.config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- setores
drop policy if exists setores_ler on public.setores;
create policy setores_ler on public.setores for select to authenticated using (true);
drop policy if exists setores_admin on public.setores;
create policy setores_admin on public.setores for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- perfis: todos veem nome/setor (aparece nas dúvidas); cada um edita o seu; admin edita todos
drop policy if exists profiles_ler on public.profiles;
create policy profiles_ler on public.profiles for select to authenticated using (true);
drop policy if exists profiles_editar_proprio on public.profiles;
create policy profiles_editar_proprio on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- catálogo: todos leem; só admin escreve
drop policy if exists trilhas_ler on public.trilhas;
create policy trilhas_ler on public.trilhas for select to authenticated using (true);
drop policy if exists trilhas_admin on public.trilhas;
create policy trilhas_admin on public.trilhas for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists secoes_ler on public.secoes;
create policy secoes_ler on public.secoes for select to authenticated using (true);
drop policy if exists secoes_admin on public.secoes;
create policy secoes_admin on public.secoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists conteudos_ler on public.conteudos;
create policy conteudos_ler on public.conteudos for select to authenticated using (publicado or public.is_admin());
drop policy if exists conteudos_admin on public.conteudos;
create policy conteudos_admin on public.conteudos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- banco de perguntas: só admin lê (colaborador recebe as perguntas pela função iniciar_questionario)
drop policy if exists perguntas_admin on public.perguntas_quiz;
create policy perguntas_admin on public.perguntas_quiz for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists faq_ler on public.faq;
create policy faq_ler on public.faq for select to authenticated using (true);
drop policy if exists faq_admin on public.faq;
create policy faq_admin on public.faq for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- dúvidas: todos leem; cada um pergunta em seu nome; só admin responde
drop policy if exists duvidas_ler on public.duvidas;
create policy duvidas_ler on public.duvidas for select to authenticated using (true);
drop policy if exists duvidas_perguntar on public.duvidas;
create policy duvidas_perguntar on public.duvidas for insert to authenticated
  with check (autor_id = auth.uid() and resposta is null and respondido_por is null);
drop policy if exists duvidas_admin on public.duvidas;
create policy duvidas_admin on public.duvidas for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists duvidas_apagar_propria on public.duvidas;
create policy duvidas_apagar_propria on public.duvidas for delete to authenticated using (autor_id = auth.uid() and resposta is null);

-- progresso/tentativas: cada um vê o seu, admin vê tudo; escrita só pelas funções abaixo
drop policy if exists progresso_ler on public.progresso;
create policy progresso_ler on public.progresso for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists tentativas_ler on public.tentativas;
create policy tentativas_ler on public.tentativas for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Funções chamadas pelo app (regras do questionário ficam no servidor)
-- =====================================================================

-- registra que a pessoa abriu o conteúdo
create or replace function public.abrir_conteudo(p_conteudo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  insert into public.progresso (user_id, conteudo_id) values (auth.uid(), p_conteudo)
  on conflict (user_id, conteudo_id) do nothing;
end $$;

-- soma o tempo com a página aberta. O app chama a cada 30 s; o servidor nunca soma mais que 35 s por chamada.
create or replace function public.ping_tempo(p_conteudo uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_tempo int;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  insert into public.progresso (user_id, conteudo_id, ultimo_ping) values (auth.uid(), p_conteudo, now())
  on conflict (user_id, conteudo_id) do update set
    tempo_seg = public.progresso.tempo_seg + case
      when public.progresso.ultimo_ping is null then 0
      else least(greatest(extract(epoch from now() - public.progresso.ultimo_ping), 0), 35)::int end,
    ultimo_ping = now()
  returning tempo_seg into v_tempo;
  return v_tempo;
end $$;

-- conteúdo SEM questionário: a pessoa marca como concluído
create or replace function public.marcar_concluido(p_conteudo uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.conteudos where id = p_conteudo and quiz_ativo) then
    raise exception 'Este conteúdo só conclui com aprovação no questionário';
  end if;
  insert into public.progresso (user_id, conteudo_id, status, concluido_em)
  values (auth.uid(), p_conteudo, 'concluido', now())
  on conflict (user_id, conteudo_id) do update set status = 'concluido', concluido_em = coalesce(public.progresso.concluido_em, now());
end $$;

-- sorteia as perguntas e embaralha as alternativas; devolve SEM a resposta certa
create or replace function public.iniciar_questionario(p_conteudo uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c public.conteudos;
  p public.progresso;
  v_sel jsonb := '[]';
  v_out jsonb := '[]';
  r record;
  v_ordem int[];
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select * into c from public.conteudos where id = p_conteudo and publicado;
  if not found or not c.quiz_ativo then raise exception 'Este conteúdo não tem questionário'; end if;
  select * into p from public.progresso where user_id = auth.uid() and conteudo_id = p_conteudo;
  if coalesce(p.tempo_seg, 0) < c.quiz_tempo_min * 60 then
    raise exception 'O questionário libera depois de % min com o conteúdo aberto', c.quiz_tempo_min;
  end if;
  if p.proxima_tentativa is not null and p.proxima_tentativa > now() and p.status <> 'concluido' then
    raise exception 'Nova tentativa liberada às %', to_char(p.proxima_tentativa at time zone 'America/Sao_Paulo', 'HH24:MI');
  end if;

  for r in
    select q.id, q.enunciado, q.alternativas
    from public.perguntas_quiz q where q.conteudo_id = p_conteudo
    order by random() limit c.quiz_sortear
  loop
    select array_agg(i order by random()) into v_ordem
    from generate_series(0, array_length(r.alternativas, 1) - 1) as i;
    v_sel := v_sel || jsonb_build_array(jsonb_build_object('id', r.id, 'ordem', to_jsonb(v_ordem)));
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'enunciado', r.enunciado,
      'alternativas', (select jsonb_agg(jsonb_build_object('i', o, 'texto', r.alternativas[o + 1]) order by ord)
                       from unnest(v_ordem) with ordinality as u(o, ord))));
  end loop;
  if jsonb_array_length(v_sel) = 0 then raise exception 'O banco de perguntas está vazio'; end if;

  insert into public.tentativas (user_id, conteudo_id, perguntas)
  values (auth.uid(), p_conteudo, v_sel) returning id into v_id;
  return jsonb_build_object('tentativa', v_id, 'perguntas', v_out, 'nota_min', c.quiz_nota_min);
end $$;

-- corrige no servidor. p_respostas = [índice original escolhido em cada pergunta, na ordem recebida]
create or replace function public.enviar_questionario(p_tentativa uuid, p_respostas jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t public.tentativas;
  c public.conteudos;
  v_total int; v_acertos int := 0; v_nota int; v_ok boolean;
  v_gab jsonb := '[]';
  i int; q public.perguntas_quiz; v_esc int; v_mostrar boolean;
begin
  select * into t from public.tentativas where id = p_tentativa and user_id = auth.uid() for update;
  if not found then raise exception 'Tentativa não encontrada'; end if;
  if t.enviada_em is not null then raise exception 'Esta tentativa já foi enviada'; end if;
  if t.iniciada_em < now() - interval '3 hours' then raise exception 'Tentativa expirada. Comece de novo.'; end if;
  select * into c from public.conteudos where id = t.conteudo_id;

  v_total := jsonb_array_length(t.perguntas);
  for i in 0 .. v_total - 1 loop
    select * into q from public.perguntas_quiz where id = (t.perguntas -> i ->> 'id')::uuid;
    v_esc := nullif(p_respostas ->> i, '')::int;
    if q.id is not null and v_esc = q.correta then v_acertos := v_acertos + 1; end if;
    if q.id is not null then
      v_gab := v_gab || jsonb_build_array(jsonb_build_object(
        'enunciado', q.enunciado, 'correta', q.correta, 'escolhida', v_esc,
        'alternativas', (select jsonb_agg(jsonb_build_object('i', (o)::int, 'texto', q.alternativas[(o)::int + 1]) order by ord)
                         from jsonb_array_elements_text(t.perguntas -> i -> 'ordem') with ordinality as u(o, ord))));
    end if;
  end loop;

  v_nota := round(100.0 * v_acertos / greatest(v_total, 1));
  v_ok := v_nota >= c.quiz_nota_min;
  update public.tentativas set respostas = p_respostas, nota = v_nota, aprovado = v_ok, enviada_em = now() where id = t.id;

  insert into public.progresso (user_id, conteudo_id) values (auth.uid(), t.conteudo_id) on conflict do nothing;
  if v_ok then
    update public.progresso set tentativas = tentativas + 1, status = 'concluido',
      nota = greatest(coalesce(nota, 0), v_nota), concluido_em = coalesce(concluido_em, now()), proxima_tentativa = null
    where user_id = auth.uid() and conteudo_id = t.conteudo_id;
  else
    update public.progresso set tentativas = tentativas + 1,
      status = case when status = 'concluido' then status else 'reprovado' end,
      nota = case when status = 'concluido' then nota else v_nota end,
      proxima_tentativa = case when status = 'concluido' then null else now() + make_interval(mins => c.quiz_espera_min) end
    where user_id = auth.uid() and conteudo_id = t.conteudo_id;
  end if;

  v_mostrar := c.quiz_gabarito = 'sempre' or (v_ok and c.quiz_gabarito = 'aprovado');
  return jsonb_build_object('nota', v_nota, 'aprovado', v_ok, 'acertos', v_acertos, 'total', v_total,
    'espera_min', c.quiz_espera_min, 'gabarito', case when v_mostrar then v_gab else null end);
end $$;

revoke execute on function public.abrir_conteudo(uuid), public.ping_tempo(uuid), public.marcar_concluido(uuid),
  public.iniciar_questionario(uuid), public.enviar_questionario(uuid, jsonb) from public, anon;
grant execute on function public.abrir_conteudo(uuid), public.ping_tempo(uuid), public.marcar_concluido(uuid),
  public.iniciar_questionario(uuid), public.enviar_questionario(uuid, jsonb), public.is_admin() to authenticated;

-- =====================================================================
-- Arquivos (Supabase Storage)
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('thumbs', 'thumbs', true),
  ('avatars', 'avatars', true),
  ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

drop policy if exists "thumbs admin" on storage.objects;
create policy "thumbs admin" on storage.objects for all to authenticated
  using (bucket_id = 'thumbs' and public.is_admin()) with check (bucket_id = 'thumbs' and public.is_admin());

drop policy if exists "arquivos ler" on storage.objects;
create policy "arquivos ler" on storage.objects for select to authenticated using (bucket_id = 'arquivos');
drop policy if exists "arquivos admin" on storage.objects;
create policy "arquivos admin" on storage.objects for all to authenticated
  using (bucket_id = 'arquivos' and public.is_admin()) with check (bucket_id = 'arquivos' and public.is_admin());

drop policy if exists "avatar proprio" on storage.objects;
create policy "avatar proprio" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Aparência: logo editável
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
