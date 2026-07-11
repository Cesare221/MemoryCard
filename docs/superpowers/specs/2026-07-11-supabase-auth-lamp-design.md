# Memory Depo: autenticação Supabase e login Lamp

## Objetivo

Substituir a persistência principal no navegador por um banco gerenciado, permitir cadastro público com acesso privado por usuário e adaptar o template `Login-Form-Lamp.zip` para uma experiência responsiva e acessível. Cada pessoa poderá criar uma conta, confirmar o e-mail, recuperar a senha e acessar apenas as próprias memórias em qualquer dispositivo.

## Escopo

O trabalho inclui:

- Supabase gerenciado para autenticação e banco Postgres;
- cadastro com nome, e-mail, senha e confirmação de e-mail;
- login, logout, recuperação e redefinição de senha;
- sessão persistente e renovação automática de tokens;
- CRUD remoto de notas, ideias, links e trechos;
- isolamento de dados com Row Level Security;
- migração opcional dos dados legados de `memory-depo-v2`;
- tela Lamp responsiva, acionada por cordão com mouse, toque ou teclado;
- estados claros de carregamento, sucesso e erro;
- testes automatizados e validação responsiva.

Não fazem parte deste escopo login social, painel administrativo, compartilhamento de memórias, colaboração entre contas, aplicativo offline ou hospedagem própria via Docker.

## Arquitetura

O frontend continuará sendo React com Vite e usará `@supabase/supabase-js`. As responsabilidades serão separadas em três limites:

1. `supabaseClient`: cria e exporta a única instância do cliente a partir de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. `AuthProvider`: inicializa a sessão, observa eventos de autenticação e oferece cadastro, login, logout, recuperação e atualização de senha.
3. `memoryService`: lista, cria, atualiza e exclui registros individuais da tabela `memory_items`.

O componente principal consumirá autenticação e dados por interfaces próprias. Ele não armazenará senhas, tokens manuais nem implementará chamadas REST de baixo nível. O fallback atual para contas e memórias locais será removido. Configuração ausente do Supabase será um erro explícito de ambiente.

## Modelo de dados

A tabela `public.memory_items` terá:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | chave primária |
| `user_id` | `uuid` | obrigatório, referência a `auth.users(id)` com exclusão em cascata |
| `type` | `text` | obrigatório, restrito a `note`, `idea`, `link` ou `snippet` |
| `content` | `text` | obrigatório e não vazio |
| `url` | `text` | opcional |
| `tags` | `text[]` | obrigatório, padrão vazio |
| `pinned` | `boolean` | obrigatório, padrão `false` |
| `created_at` | `timestamptz` | obrigatório, padrão `now()` |
| `updated_at` | `timestamptz` | obrigatório, atualizado em cada alteração |

O cliente converterá timestamps ISO do banco para o formato usado pela interface somente na fronteira do serviço. Um script SQL versionado criará tabela, índices, trigger de `updated_at`, permissões e políticas.

## Segurança e RLS

Row Level Security será habilitado em `memory_items`. As quatro operações usarão `auth.uid() = user_id`:

- `SELECT`: o usuário lê somente linhas próprias;
- `INSERT`: `user_id` deve ser o identificador da sessão;
- `UPDATE`: a linha existente e o resultado atualizado devem pertencer ao usuário;
- `DELETE`: somente o proprietário pode excluir.

A chave publicável do Supabase poderá ficar no frontend porque a autorização real será aplicada pelo JWT e pelas políticas RLS. Nenhuma `service_role` será exposta. A implementação atual que grava senhas em texto puro no `localStorage` será removida, assim como o fallback silencioso para autenticação local.

## Fluxos de autenticação

### Inicialização

O aplicativo exibirá um estado de carregamento enquanto o SDK restaura a sessão. Somente depois disso mostrará a tela de autenticação ou o conteúdo privado, evitando troca visual e requisições antes da identidade estar definida.

### Cadastro e confirmação

O cadastro receberá nome, e-mail e senha. O nome será armazenado em `user_metadata`. Com confirmação de e-mail habilitada, o envio bem-sucedido não será tratado como sessão autenticada: a interface mostrará uma instrução para verificar a caixa de entrada e permitirá voltar ao login.

### Login e logout

O login usará e-mail e senha pelo SDK. O logout encerrará a sessão no Supabase, limpará somente o estado privado em memória e retornará à tela Lamp.

### Recuperação de senha

O usuário informará o e-mail e receberá uma resposta neutra de sucesso. O link apontará para uma URL autorizada do aplicativo. Ao receber o evento `PASSWORD_RECOVERY`, a interface apresentará o formulário de nova senha e concluirá a alteração com `updateUser`.

URLs locais e de produção deverão constar na lista de redirecionamentos do Supabase. Confirmação e recuperação dependem de SMTP; o serviço padrão poderá ser usado apenas no desenvolvimento, e produção deverá utilizar SMTP configurado pelo proprietário do projeto.

## Persistência das memórias

Depois da autenticação, o aplicativo carregará todas as memórias do usuário antes de liberar mutações. Não haverá efeito genérico que salve a lista inteira ao mudar o estado. Cada comando da interface corresponderá a uma operação individual:

- adicionar → `INSERT`;
- editar ou fixar → `UPDATE` da linha;
- excluir → `DELETE` da linha;
- carregar → `SELECT` ordenado por `updated_at` decrescente.

Durante uma mutação, o controle relacionado ficará bloqueado. O estado local será confirmado após sucesso remoto. Em caso de falha, a interface manterá o conteúdo editado sempre que aplicável e mostrará uma mensagem acionável. Falhas remotas não serão convertidas em salvamento local silencioso.

## Migração do armazenamento legado

Após o primeiro login de cada conta no navegador, o aplicativo procurará `memory-depo-v2`. Se houver itens válidos, perguntará se o usuário deseja importá-los. Ao aceitar:

1. os itens serão normalizados e enviados com `upsert` usando seus identificadores quando forem UUIDs válidos e novos UUIDs quando não forem;
2. a conclusão será registrada em uma chave local específica do usuário somente após todos os registros serem persistidos;
3. o valor original de `memory-depo-v2` será preservado como segurança;
4. uma nova tentativa será possível se a importação falhar.

A marca por usuário evita repetição na mesma conta. Como o armazenamento legado pertence ao navegador e não possui identidade, a confirmação deixa explícito que os itens visíveis serão associados à conta atualmente conectada.

## Tela Lamp

A tela começará apagada. Nesse estado, somente a luminária e a instrução “Puxe para acender” estarão visíveis; o formulário ficará invisível, sem receber foco e sem eventos de ponteiro.

O cordão será controlado por Pointer Events nativos do React:

- `pointerdown` inicia o gesto e captura o ponteiro;
- `pointermove` limita o deslocamento vertical e atualiza a linha e a bolinha;
- `pointerup` alterna a luz quando o limite mínimo for ultrapassado e sempre retorna o cordão;
- clique, `Enter` e `Espaço` oferecem alternativas equivalentes.

Não haverá dependência de GSAP, áudio remoto ou scripts por CDN. Animações de luz, formulário e retorno do cordão usarão CSS. `prefers-reduced-motion` reduzirá ou eliminará movimento sem remover funcionalidade.

No desktop, luminária e formulário ficarão lado a lado. Em telas de até 720 px, a luminária compacta ficará acima do formulário, sem altura fixa que provoque corte. O conteúdo poderá rolar em telas baixas e respeitará áreas seguras móveis.

## Estados da interface

A área da luminária reutilizará o mesmo contêiner para:

- entrar;
- criar conta;
- confirmação enviada;
- solicitar recuperação;
- definir nova senha.

Mudanças de modo não apagarão mensagens importantes. Botões mostrarão carregamento e impedirão envio duplicado. Mensagens de autenticação serão traduzidas para português, sem revelar no fluxo de recuperação se um endereço específico está cadastrado.

Depois do login, o cabeçalho mostrará o nome ou e-mail e uma ação “Sair”. O restante do visual e das funcionalidades atuais — pesquisa, filtros, cartões, importação e exportação JSON — será preservado.

## Tratamento de erros

- Ambiente sem URL ou chave publicável: tela explícita de configuração, sem fallback.
- Falha de rede no login ou CRUD: mensagem em português e possibilidade de tentar novamente.
- Sessão expirada: o SDK tentará renovar; se não puder, o estado privado será limpo e o login reaparecerá.
- Arquivo legado inválido: nenhum envio e mensagem de formato inválido.
- Importação parcial: não marca conclusão; nova tentativa deve ser idempotente.
- E-mail pendente: orientação para confirmar antes de entrar.

## Verificação

Testes automatizados cobrirão:

- estados e transições do `AuthProvider`;
- cadastro com confirmação, login, logout e recuperação de senha;
- CRUD e mapeamento entre objetos da interface e linhas do banco;
- migração legada válida, inválida, repetida e parcialmente malsucedida;
- gesto do cordão e alternativas por clique e teclado;
- formulário inacessível enquanto a luz estiver apagada;
- mensagens de erro e prevenção de envios duplicados.

A validação manual cobrirá dois usuários para comprovar RLS, confirmação e recuperação reais por e-mail, mouse e toque, larguras móveis e desktop, sessão após recarregar a página e build de produção. O projeto só será considerado concluído após `npm test` e `npm run build` passarem e o SQL de RLS ser verificado no Supabase.

## Configuração e entrega

O repositório incluirá:

- `.env.example` com nomes das variáveis, sem credenciais;
- migração SQL reproduzível;
- instruções de criação do projeto Supabase, habilitação da confirmação de e-mail, URLs de redirecionamento, SMTP de produção e aplicação da migração;
- instruções equivalentes para variáveis de ambiente na Vercel;
- documentação do resgate de dados legados.

Credenciais reais permanecerão fora do Git.
