# Universidade Rottas — como colocar no ar

Portal de treinamentos da Rottas. O app é feito em **React (Vite)**, o banco e o login ficam no **Supabase**, a hospedagem na **Vercel**, e os vídeos continuam no **SharePoint**.

```
SharePoint (vídeos)  ──iframe──►  App na Vercel  ◄──►  Supabase (login, banco, PDFs, fotos)
```

Siga as etapas na ordem. Leva por volta de 1 hora na primeira vez.

---

## 1. Supabase: banco e login

1. Em [supabase.com](https://supabase.com), clique em **New project**. Escolha a região **South America (São Paulo)** e anote a senha do banco.
2. Abra **SQL Editor → New query** e cole o conteúdo de `supabase/01_schema.sql` inteiro. Clique em **Run**.
3. Em outra query, cole `supabase/02_seed.sql` e clique em **Run**. Esse arquivo cria o setor Excelência Operacional e as trilhas, seções e conteúdos de exemplo do protótipo. Os outros setores você cadastra no app, em **Gerenciar conteúdo → Setores**.
   - Se você entrou no app **antes** de rodar os arquivos, rode também `supabase/03_correcao_perfil.sql`. Ele cria o perfil que ficou faltando e deixa o Rodrigo como admin.
4. Em **Authentication → Sign In / Providers → Email**:
   - deixe **Email** ligado;
   - em **Email OTP Length**, use **6**.
5. Em **Authentication → Emails → Templates**, abra o modelo **Magic Link** e troque o texto por:

   ```html
   <h2>Seu código da Universidade Rottas</h2>
   <p>Digite este código na tela de login:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>O código vale por 1 hora. Se não foi você, ignore este e-mail.</p>
   ```

   Faça o mesmo no modelo **Confirm signup**, que é o usado no primeiro acesso de cada pessoa.

   > O login usa **código de 6 dígitos**, não link. O antivírus do e-mail da empresa costuma "clicar" nos links antes da pessoa, e aí o link chega já usado. O código não tem esse problema.

6. **E-mail de envio (obrigatório para produção).** O e-mail padrão do Supabase é só para testes: manda poucas mensagens por hora. Em **Authentication → Emails → SMTP Settings**, configure um destes:
   - **Microsoft 365 da Rottas**: peça ao TI uma caixa como `universidade@rottasconstrutora.com.br` com SMTP autenticado (host `smtp.office365.com`, porta `587`);
   - ou um serviço como **Resend** ou **Brevo**, que têm plano gratuito suficiente para o volume da empresa.
7. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**. Elas vão para a Vercel no passo 3.

**Quem é administrador:** o e-mail `rodrigo.machado@rottasconstrutora.com.br` já entra como admin. Para promover outra pessoa depois que ela fizer o primeiro login, rode no SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'nome.sobrenome@rottasconstrutora.com.br';
```

**Só e-mails da empresa entram.** O banco recusa qualquer e-mail que não seja `@rottasconstrutora.com.br`. O domínio está na tabela `config`.

---

## 2. GitHub: guardar o código

1. No GitHub, crie um repositório **privado** chamado `universidade-rottas`.
2. Envie esta pasta para ele. O jeito mais fácil é o **GitHub Desktop**: *File → Add local repository* → escolha esta pasta → *Publish repository*.
   - Pelo site também funciona: *Add file → Upload files*, arrastando o conteúdo da pasta.
   - Não envie `node_modules` nem `.env.local`. O `.gitignore` já exclui os dois.

---

## 3. Vercel: colocar no ar

1. Na Vercel, clique em **Add New → Project** e importe o repositório `universidade-rottas`.
2. A Vercel reconhece o **Vite** sozinha. Não mude nada em Build.
3. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | a Project URL do Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a chave anon public |

4. Clique em **Deploy**. No fim, a Vercel mostra o endereço do site (algo como `universidade-rottas.vercel.app`).
5. Volte ao Supabase, em **Authentication → URL Configuration**, e coloque esse endereço em **Site URL**.
6. Abra o site, entre com seu e-mail e preencha setor e cargo. Pronto.

> **Plano da Vercel:** o plano gratuito (Hobby) é só para uso pessoal e não comercial. Para um portal da empresa, o certo é o **Pro**. Você pode testar no Hobby e mudar antes de liberar para todo mundo.
>
> **Domínio próprio (opcional):** em *Settings → Domains* dá para usar, por exemplo, `universidade.rottasconstrutora.com.br`. O TI só precisa criar um registro CNAME.

Toda vez que você enviar uma alteração para o GitHub, a Vercel publica a nova versão sozinha.

---

## 4. SharePoint: vídeos

**Uma vez só:**

1. Crie um site no SharePoint, por exemplo "Universidade Rottas".
2. Dentro dele, crie uma **biblioteca de documentos** chamada "Vídeos", com pastas iguais às trilhas e seções (`Engenharia/ERP`, `Engenharia/BPMs`…).
3. Em *Configurações do site → Permissões*, dê **Leitura** para "Todos, exceto usuários externos". Edição fica só com quem administra a Universidade.
4. Copie para essa biblioteca as gravações do Teams (elas nascem no OneDrive de quem organizou a reunião).
5. **Expiração:** gravações do Teams costumam expirar sozinhas. No painel *Detalhes* de cada vídeo, mude a expiração para **Nunca**, e peça ao TI para conferir a política de expiração.

**Para cada vídeo:**

1. Abra o vídeo e clique em **Compartilhar → Incorporar → Copiar**.
2. Na Universidade, vá em **Gerenciar conteúdo → Editar** e cole o código no campo "Código de incorporação do SharePoint". O app guarda só o endereço e avisa se você colou o link errado.

**O player do SharePoint só toca para quem está logado na conta Microsoft da Rottas no mesmo navegador.** No Edge e no Chrome da empresa isso já acontece. Se alguém vir uma tela pedindo login dentro do player, é só entrar uma vez no Office.

**PDF e slides:** envie o PDF direto no editor (o PowerPoint pode ser exportado como PDF). Ele fica guardado no Supabase Storage, com limite de 50 MB por arquivo no plano gratuito.

---

## 5. Como o questionário evita cola

Tudo isso roda **no servidor (Supabase)**, não no navegador:

- O gabarito nunca vai para o computador do colaborador. As perguntas chegam sem a resposta certa, e a correção é feita pela função `enviar_questionario`.
- Cada tentativa sorteia perguntas do banco e embaralha as alternativas.
- O questionário só libera depois do **tempo mínimo com o conteúdo aberto**. O app avisa o servidor a cada 30 s, e o servidor nunca soma mais que 35 s por aviso, então não adianta mexer no relógio do computador.
- Quem reprova espera o intervalo configurado e não vê o gabarito (configurável por conteúdo).
- Só quem é aprovado aparece como concluído no Painel gerencial.

---

## 6. Rodar no seu computador (opcional)

Precisa do [Node.js 20+](https://nodejs.org).

```bash
npm install
copy .env.example .env.local    # e preencha com a URL e a chave do Supabase
npm run dev                      # abre em http://localhost:5173
```

Para o login funcionar localmente, adicione `http://localhost:5173` em *Supabase → Authentication → URL Configuration → Redirect URLs*.

---

## 7. Custos e limites (plano gratuito)

| Serviço | Gratuito | Quando pagar |
|---|---|---|
| Supabase Free | 500 MB de banco, 1 GB de arquivos, 50 MB por arquivo. **Pausa o projeto depois de 1 semana sem uso.** | Para produção, o Pro (~US$ 25/mês) evita a pausa e traz backup diário |
| Vercel Hobby | Suficiente em volume, mas **só para uso não comercial** | Pro (por pessoa da equipe que publica, não por quem acessa) |
| SharePoint | Já incluso no Microsoft 365 da Rottas | — |

Como os vídeos ficam no SharePoint, o banco do Supabase quase não cresce. Ele guarda só textos, notas, PDFs e fotos de perfil.

---

## 8. Onde fica cada coisa no código

```
supabase/01_schema.sql   tabelas, segurança (RLS), funções do questionário, buckets de arquivos
supabase/02_seed.sql     dados de exemplo (pode rodar de novo sem duplicar)
src/lib/store.tsx        sessão, perfil, catálogo e progresso carregados do Supabase
src/lib/types.ts         tipos e regras de status (pendente/aprovado)
src/Layout.tsx           barra lateral, cabeçalho, menu e Meu perfil
src/pages/Conteudo.tsx   player, contagem de tempo, questionário, dúvidas
src/pages/Editor.tsx     cadastro de conteúdo, banco de perguntas, FAQ
src/pages/Painel.tsx     painel gerencial por setor
src/styles.css           visual (cores do Portal Rottas)
```

**Ainda não implementado:** envio das notificações (as preferências já ficam salvas no perfil) e o resumo semanal por e-mail. Os dois podem vir depois, com uma Edge Function do Supabase.
