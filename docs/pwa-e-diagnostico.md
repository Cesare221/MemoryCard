# PWA e diagnóstico — 28/10/2026

## Erro de produção

O site respondeu HTTP 200, mas o bundle publicado e o .env usam `https://xmwfdknmwhuetqzleduv.supabase.co`, que retornou DNS inexistente nesta verificação. A chave anon local pertence ao mesmo projeto. O usuário confirmou que essa URL é a correta; nenhuma credencial foi alterada.

Verificar no painel do Supabase se o projeto está pausado, restaurando ou foi excluído. Se pausado, usar Resume project; se ativo e o DNS continuar indisponível, investigar com o suporte. Não apagar dados nem criar um banco substituto antes de verificar a recuperação do projeto.

Referência: https://supabase.com/kb/troubleshooting/nxdomain-error-connecting-to-a-supabase-project

## Instalação implementada

- Manifest standalone, ícones 192/512, maskable e apple-touch-icon.
- Botão no login e no cabeçalho. Usa o prompt nativo quando disponível; fora dele, apresenta instruções para o navegador. No iPhone, orienta Compartilhar → Adicionar à Tela de Início.
- Service worker somente em build de produção. Guarda apenas /offline.html. Não guarda notas, credenciais ou respostas da API em Cache Storage.
- Fallback em falhas de navegação depois da primeira visita online. Não implementa edição completa offline e não altera a fila local existente.

## Publicação

1. Publicar estas mudanças pelo fluxo habitual de deploy da Vercel (`npm run build`, saída `dist`).
2. Manter VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY correspondentes ao projeto confirmado. Alterações de variáveis VITE exigem novo build.
3. Verificar /manifest.webmanifest, /sw.js, /offline.html e /icons/ na URL publicada.
4. Abrir o site em Android/Chrome e iPhone/Safari, instalar e confirmar abertura independente do navegador.
5. Após uma visita online e ativação do worker, desligar a rede e reabrir para conferir a página offline.

## Sugestões de design

1. Mostrar o login imediatamente; manter a luminária como detalhe opcional. Hoje o formulário está invisível até uma interação não convencional.
2. Reduzir a altura da luminária no celular e aproximar formulário e ação principal do topo.
3. Aumentar contraste da dica do cordão e oferecer interação por toque, além do arraste e teclado.
4. Distinguir “Salvo neste aparelho”, “Sincronizado” e “Sem conexão”. Atualmente uma falha ao carregar com cache pode voltar ao estado idle e aparentar sucesso.
5. Antes de oferecer notas offline completas, revisar a fila: ela é global, não isolada por usuário, e só é limpa após processar todas as operações; uma falha intermediária pode repetir operações já aplicadas.

Estas sugestões não constituem um redesign aplicado.

## Validação

41 testes passaram, incluindo 9 novos testes de instalação e worker. Build passou. Recursos PWA responderam HTTP 200 com os tipos esperados no preview. Modal de instruções conferido visualmente. Instalação em aparelho físico e deploy de produção ainda não executados. Alteração preexistente em vite.config.js preservada.
