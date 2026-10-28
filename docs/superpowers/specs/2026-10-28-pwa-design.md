# PWA Memory Depo

Escopo aprovado pelo usuário: botão Instalar aplicativo, prompt nativo quando disponível, instruções para iPhone e página offline. Sem prometer edição offline completa.

Manifest com identidade estável, display standalone, ícones PNG 192/512 e apple-touch-icon. Service worker guarda apenas a página offline; navegação tenta a rede e usa fallback quando indisponível. Não armazenar respostas do Supabase nem páginas com tokens de recuperação no cache.

O botão fica disponível no login e no cabeçalho autenticado, some no modo instalado e oferece instruções quando o navegador não disponibiliza prompt. Cancelar permite tentar novamente quando houver novo evento. Falha do prompt exibe instruções.

Diagnóstico: produção e .env apontam para xmwfdknmwhuetqzleduv.supabase.co (DNS inexistente na verificação). Usuário confirmou que esse é o endereço correto após corrigir uma URL enviada inicialmente. Preservar URL e chave pública; conferir estado do projeto no Supabase. Não inventar chave nem trocar por service_role.

Sugestões de design: formulário sempre visível, luminária opcional; reduzir altura da ilustração no celular; melhorar contraste da dica; distinguir falha de sincronização de estado salvo.

Validação: testes de instalação, fallback e isolamento do cache; build; inspeção visual e verificação dos arquivos servidos. Instalação final depende do navegador do aparelho.
