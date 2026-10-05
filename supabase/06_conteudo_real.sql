-- =====================================================================
-- Universidade Rottas — conteúdo real (EAP aprovada)
-- ATENÇÃO: apaga TODO o conteúdo atual (trilhas, seções, conteúdos, questionários,
-- dúvidas, progresso e tentativas) e cria a estrutura nova.
-- Perfis e setores das pessoas são mantidos.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- ordem dos conteúdos dentro da seção (usada pelo arrastar e soltar)
alter table public.conteudos add column if not exists ordem int not null default 0;

-- limpa o conteúdo de exemplo (perguntas, FAQ, dúvidas, progresso e tentativas saem junto)
delete from public.conteudos;
delete from public.secoes;
delete from public.trilhas;

-- setores da Rottas
insert into public.setores (nome, ordem) values
  ('Obras', 0),
  ('Arquitetura', 1),
  ('Assistência Técnica', 2),
  ('Central de Notas', 3),
  ('Comercial', 4),
  ('Contas a Pagar', 5),
  ('Contas a Receber', 6),
  ('Créditos Imobiliários', 7),
  ('Departamento Pessoal', 8),
  ('DHO', 9),
  ('Marketing', 10),
  ('Diretoria', 11),
  ('Excelência Operacional', 12),
  ('Facilities', 13),
  ('Financeiro', 14),
  ('Financiamento', 15),
  ('Gente e Gestão', 16),
  ('Gestão de Empreiteiros', 17),
  ('Incorporação', 18),
  ('Jurídico', 19),
  ('Legalização', 20),
  ('Novos Negócios', 21),
  ('Núcleo BIM', 22),
  ('Orçamentos', 23),
  ('PCP Coproativo', 24),
  ('PCP Obras', 25),
  ('Projetos Complementares', 26),
  ('Qualidade da Obra', 27),
  ('Relacionamento com Cliente', 28),
  ('Segurança do Trabalho', 29),
  ('Suprimentos', 30),
  ('Tecnologia e Inovação', 31),
  ('Vendas', 32)
on conflict (nome) do update set ordem = excluded.ordem;


-- ===== Trilha Integração =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('integracao', 'Integração', 'Para quem está chegando: a Rottas, nossa cultura e como as coisas funcionam por aqui.', '#34495E', '#56708C', 0)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'int-boas-vindas', 'Boas-vindas', 'Nossa história, cultura e jeito de trabalhar.', 0 from public.trilhas where slug = 'integracao'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;

-- ===== Trilha Engenharia =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('engenharia', 'Engenharia', 'Os processos de obra, passo a passo: do pedido de material à medição.', '#E07A0B', '#FF9E2C', 1)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-solicitacao', 'Solicitação de material e M.O.', 'Como pedir material e mão de obra para a obra.', 0 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Processo de aquisição de material e M.O.', 'pilula', array['fluxo','material','mão de obra']::text[], 0),
  ('Solicitação de material e M.O.', 'pilula', array['passo a passo','portal','material','mão de obra']::text[], 1)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-solicitacao' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-caixinha', 'Caixinha de obra', 'Compras pequenas pagas pela caixinha da obra.', 1 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Fluxo da caixinha de obra', 'pilula', array['fluxo','caixinha']::text[], 0),
  ('Medição da caixinha', 'pilula', array['passo a passo','medição','caixinha','mega']::text[], 1)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-caixinha' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-deposito', 'Compra depósito', 'Compras feitas em depósito de materiais.', 2 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Fluxo da compra depósito', 'pilula', array['fluxo','compra depósito']::text[], 0),
  ('BPM de fornecedor depósito', 'pilula', array['passo a passo','portal','fornecedor','compra depósito']::text[], 1),
  ('Medição da compra depósito', 'pilula', array['passo a passo','medição','compra depósito','mega']::text[], 2)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-deposito' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-contratos', 'Contratos e aditivos', 'Cotação, novo contrato e aditivos.', 3 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Gerar novo contrato', 'pilula', array['passo a passo','contrato','mega']::text[], 0),
  ('Como realizar uma cotação no Mega', 'pilula', array['passo a passo','cotação','mega']::text[], 1),
  ('Aditivo de contrato', 'pilula', array['passo a passo','aditivo','contrato']::text[], 2)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-contratos' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-orcamento', 'Orçamento e atualização orçamentária', 'O rito mensal de atualização orçamentária e a aprovação de estouros.', 4 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Interpretação da tela de estouros no Approvo', 'pilula', array['passo a passo','approvo','aditivo','orçamento']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-orcamento' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'eng-fornecedores', 'Fornecedores', 'Cadastro e inclusão de fornecedores.', 5 from public.trilhas where slug = 'engenharia'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Inserir fornecedor no CTE', 'pilula', array['passo a passo','fornecedor','cte']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'eng-fornecedores' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);

-- ===== Trilha Ferramentas Rottas =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('ferramentas', 'Ferramentas Rottas', 'Os sistemas da Rottas: o básico de cada um, para usar no dia a dia.', '#3B3A39', '#6A6867', 2)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-portal', 'Portal de Serviços', 'Primeiros passos no Portal: abrir, acompanhar e aprovar solicitações.', 0 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-mega', 'Mega (ERP)', 'Primeiros passos no Mega: navegação e consultas.', 1 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-rottas-control', 'Rottas Control', 'Primeiros passos no Rottas Control, usado na atualização orçamentária.', 2 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-mereo', 'Mereo', 'Metas e feedback no Mereo.', 3 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Feedback contínuo', 'pilula', array['passo a passo','mereo','feedback']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'fer-mereo' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-anomalias', 'Anomalias', 'Do registro à finalização de uma anomalia (meta: 3 por setor no mês).', 4 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Como abrir uma anomalia', 'pilula', array['passo a passo','powerapps','anomalias']::text[], 0),
  ('Como encaminhar uma anomalia para a equipe', 'pilula', array['passo a passo','powerapps','anomalias']::text[], 1),
  ('Como resolver uma anomalia', 'pilula', array['passo a passo','powerapps','anomalias']::text[], 2),
  ('Como finalizar uma anomalia', 'pilula', array['passo a passo','powerapps','anomalias']::text[], 3)
) as v(titulo, formato, tags, ordem)
where s.slug = 'fer-anomalias' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'fer-canva', 'Canva', 'Criações rápidas no Canva.', 5 from public.trilhas where slug = 'ferramentas'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Como realizar uma criação em lote no Canva', 'pilula', array['passo a passo','canva']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'fer-canva' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);

-- ===== Trilha Microsoft 365 =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('microsoft-365', 'Microsoft 365', 'Outlook, Teams, Excel e as outras ferramentas Microsoft do dia a dia.', '#0F5FA8', '#2E86DE', 3)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-outlook', 'Outlook', 'E-mail e calendário.', 0 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Responder, responder a todos e encaminhar', 'pilula', array['passo a passo','outlook','e-mail']::text[], 0),
  ('Agendar o envio de um e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 1),
  ('Confirmação de leitura no envio de e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 2),
  ('Relatar um e-mail de phishing', 'pilula', array['passo a passo','outlook','e-mail','segurança']::text[], 3),
  ('Cópia (CC) e cópia oculta (CCO)', 'pilula', array['passo a passo','outlook','e-mail']::text[], 4),
  ('Compartilhar o calendário pessoal', 'pilula', array['passo a passo','outlook','calendário']::text[], 5),
  ('Receber e enviar anexos por e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 6),
  ('Criar regra de e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 7),
  ('Configurar o layout do e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 8),
  ('Como criar assinatura de e-mail', 'pilula', array['passo a passo','outlook','e-mail']::text[], 9),
  ('Como agendar as salas de reunião', 'pilula', array['passo a passo','outlook','calendário','salas']::text[], 10),
  ('Como adicionar o calendário das salas de reunião', 'pilula', array['passo a passo','outlook','calendário','salas']::text[], 11),
  ('Como organizar a caixa de entrada', 'pilula', array['passo a passo','outlook','e-mail']::text[], 12),
  ('Como colocar mensagem automática', 'pilula', array['passo a passo','outlook','e-mail']::text[], 13)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-outlook' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-teams', 'Teams', 'Chat, reuniões e equipes.', 1 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Visão geral do Teams', 'pilula', array['primeiros passos','teams']::text[], 0),
  ('Funcionalidades do chat', 'pilula', array['passo a passo','teams','chat']::text[], 1),
  ('Como configurar notificações', 'pilula', array['passo a passo','teams']::text[], 2),
  ('Como iniciar uma reunião', 'pilula', array['passo a passo','teams','reunião']::text[], 3),
  ('Configurações em uma reunião', 'pilula', array['passo a passo','teams','reunião']::text[], 4),
  ('Como usar o atalho do OneDrive no Teams', 'pilula', array['passo a passo','teams','onedrive']::text[], 5),
  ('Gerenciamento de equipes', 'pilula', array['passo a passo','teams']::text[], 6)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-teams' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-sharepoint', 'SharePoint e Rottas Cloud', 'Arquivos da Rottas na nuvem.', 2 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('O que é o SharePoint', 'pilula', array['primeiros passos','sharepoint']::text[], 0),
  ('Como acessar os arquivos da Rottas', 'pilula', array['passo a passo','sharepoint','rottas cloud']::text[], 1),
  ('Como compartilhar arquivos do Rottas Cloud', 'pilula', array['passo a passo','sharepoint','rottas cloud']::text[], 2)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-sharepoint' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-excel', 'Excel', 'Planilhas, fórmulas e gráficos.', 3 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Visão geral do Excel', 'pilula', array['primeiros passos','excel']::text[], 0),
  ('Como salvar uma planilha no Rottas Cloud', 'pilula', array['passo a passo','excel','rottas cloud']::text[], 1),
  ('Conhecendo fórmulas no Excel', 'pilula', array['passo a passo','excel','fórmulas']::text[], 2),
  ('Como criar gráficos', 'pilula', array['passo a passo','excel','gráficos']::text[], 3),
  ('Como compartilhar planilhas', 'pilula', array['passo a passo','excel']::text[], 4),
  ('Como proteger uma planilha', 'pilula', array['passo a passo','excel','segurança']::text[], 5)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-excel' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-word', 'Word', 'Documentos de texto.', 4 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Visão geral do Word', 'pilula', array['primeiros passos','word']::text[], 0),
  ('Como compartilhar e exportar arquivos do Word', 'pilula', array['passo a passo','word']::text[], 1)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-word' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-powerpoint', 'PowerPoint', 'Apresentações.', 5 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Visão geral do PowerPoint', 'pilula', array['primeiros passos','powerpoint']::text[], 0),
  ('Criando animações no PowerPoint', 'pilula', array['passo a passo','powerpoint']::text[], 1)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-powerpoint' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'm365-onenote', 'OneNote', 'Anotações organizadas.', 6 from public.trilhas where slug = 'microsoft-365'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Visão geral e uso do OneNote', 'pilula', array['primeiros passos','onenote']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'm365-onenote' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);

-- ===== Trilha Dashboards =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('dashboards', 'Dashboards', 'Um vídeo para cada painel de BI: o que mostra e como ler.', '#1F7A5C', '#2FA37B', 4)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'dash-obra', 'Painéis da obra', 'Os BIs usados no acompanhamento das obras.', 0 from public.trilhas where slug = 'dashboards'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;

-- ===== Trilha BIM =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('bim', 'BIM', 'A metodologia BIM na Rottas.', '#5B4B8A', '#7D6BB0', 5)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'bim-coordenacao', 'Coordenação de modelos', 'Configuração e coordenação dos modelos BIM.', 0 from public.trilhas where slug = 'bim'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Coordenadas compartilhadas', 'pilula', array['passo a passo','bim','revit']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'bim-coordenacao' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);

-- ===== Trilha Desenvolvimento =====
insert into public.trilhas (slug, nome, descricao, cor, cor2, ordem) values ('desenvolvimento', 'Desenvolvimento', 'Treinamentos de gestão e performance.', '#A2491F', '#CF6A35', 6)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, cor = excluded.cor, cor2 = excluded.cor2, ordem = excluded.ordem;
insert into public.secoes (trilha_id, slug, nome, descricao, ordem) select id, 'dev-short', 'Short Training Sessions', 'Sessões curtas propostas pelo setor de Gestão sobre performance.', 0 from public.trilhas where slug = 'desenvolvimento'
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;
insert into public.conteudos (secao_id, titulo, tipo, formato, tags, ordem, quiz_ativo, autor)
select s.id, v.titulo, 'video', v.formato, v.tags, v.ordem, false, 'Excelência Operacional'
from public.secoes s, (values
  ('Treinamento: gestão do tempo', 'treinamento', array['treinamento gravado','gestão do tempo','performance']::text[], 0)
) as v(titulo, formato, tags, ordem)
where s.slug = 'dev-short' and not exists (select 1 from public.conteudos c where c.secao_id = s.id and c.titulo = v.titulo);

-- confira
select t.nome as trilha, count(distinct s.id) as secoes, count(c.id) as conteudos
from public.trilhas t left join public.secoes s on s.trilha_id = t.id left join public.conteudos c on c.secao_id = s.id
group by t.nome, t.ordem order by t.ordem;
