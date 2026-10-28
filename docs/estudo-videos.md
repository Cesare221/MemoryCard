# Vídeos no Memory Depo

Estudo de viabilidade — 28/10/2026. Upload de vídeos ainda não implementado.

## Recomendação

Manter PostgreSQL/Supabase para notas e metadados. Para um primeiro upload de vídeos pessoais curtos, usar Supabase Storage privado. Arquivos não devem ir para `memory_items.image_data`, JSON exportado, localStorage ou fila offline atual.

| Opção | Uso | Limitação |
| --- | --- | --- |
| Salvar link externo | YouTube, Instagram e referências que já estão online | Não guarda uma cópia; links podem deixar de funcionar. Não assumir que URL externa é um MP4 reproduzível. |
| Supabase Storage privado | Arquivos pessoais curtos, volume moderado | Playback depende do codec original; planejar conversão se houver MOV/HEVC incompatível. |
| Serviço de vídeo como Cloudflare Stream | Muitos vídeos, vários formatos, qualidade adaptativa | Serviço e cobrança adicionais; exige backend para autorizar uploads e acesso. |

## MVP proposto

- Um vídeo por memória, selecionado pela galeria, com legenda e tags.
- Limite inicial sugerido: 25 MB por arquivo e 2 minutos. São limites do produto propostos, não limites contratados do Supabase; validar no bucket e conferir o plano antes de implementar.
- Priorizar MP4 H.264/AAC. A extensão MP4 não garante codec compatível: validar reprodução no aparelho, informar incompatibilidade e testar vídeos reais de Android e iPhone. Sem prometer suporte universal a MOV/HEVC.
- Upload direto navegador → Storage usando TUS: progresso, cancelar, tentar novamente. O Supabase recomenda uploads retomáveis acima de 6 MB e em redes instáveis.
- Thumbnail no card; player apenas na leitura, com `controls`, `playsInline` e `preload="metadata"`, sem autoplay. Evitar baixar todos os vídeos ao abrir a coleção.
- Estados explícitos: enviando, interrompido, disponível, falha e removendo. Não marcar como salvo antes de confirmar arquivo e registro.
- Primeiro acesso depende de internet. Não adicionar cache offline de vídeos neste MVP.

## Dados e autorização

Criar tabela `memory_attachments` com id, memory_id, user_id, bucket, object_path, mime_type, size_bytes, duration_seconds, thumbnail_path e status. O caminho deve usar `user_id/attachment_id/...` gerado pela aplicação. Guardar caminhos, não URLs assinadas com validade limitada.

Bucket privado `memory-videos`, com restrição de tamanho e tipos. RLS deve verificar proprietário para SELECT/INSERT/DELETE na tabela e no Storage, incluindo a relação da memória com o usuário. Nenhuma chave service_role no frontend. Upload autenticado, sem upsert de caminhos arbitrários.

Ao reproduzir, gerar URL assinada curta e renovar se expirar. Uma URL assinada é compartilhável enquanto válida; logout não a revoga. Escolher validade compatível com a duração da reprodução e evitar persistir essas URLs em logs ou exports.

## Consistência e custos

1. Criar registro pending com identificador estável e autorização.
2. Enviar arquivo com progresso; confirmar metadados e marcar ready.
3. Se o upload ou gravação falhar, permitir retomar e limpar objetos órfãos com rotina autenticada.
4. Ao excluir, respeitar os 5 segundos de desfazer existentes; só então excluir arquivo e metadados. Tratar falhas parciais com nova tentativa idempotente.
5. Export JSON leva apenas metadados; informar que backup dos arquivos é separado. Import não pode associar caminhos de outro usuário.

Exemplo ilustrativo: 100 vídeos de 20 MB ocupam aproximadamente 2 GB. Cinco reproduções completas de cada representam aproximadamente 10 GB de transferência, além de miniaturas e retries. Não é estimativa de preço; avaliar armazenamento, saída de dados e quantidade de visualizações no plano real.

## Enviar pelo menu Compartilhar do celular

É uma segunda etapa: Web Share Target pode registrar o PWA instalado como destino em plataformas compatíveis. Arquivos exigem `POST` e `multipart/form-data`, rota de recebimento e alterações no service worker. O worker atual só trata navegação GET, portanto adicionar apenas o manifest seria insuficiente.

Receber em rascunho local temporário, pedir login se necessário, permitir confirmar destino e legenda, e só enviar após ação do usuário. Limpar rascunhos abandonados. Validar suporte em Android/Chrome; manter o botão de upload como caminho universal e não prometer integração idêntica no iPhone.

## Validação antes de liberar

Arquivo acima do limite; tipo falso; codec incompatível; cancelamento; rede interrompida; sessão expirada; reabertura no celular; URL assinada expirada; tentativa de acesso de outro usuário; exclusão com desfazer; limpeza de órfãos; uso de dados; import/export. Resolver a disponibilidade do projeto Supabase antes de testes de integração.

## Fontes oficiais

- [Supabase: uploads retomáveis](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase: buckets privados e restrições](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase: URLs assinadas](https://supabase.com/docs/guides/storage/serving/downloads)
- [MDN: Web Share Target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)
- [Cloudflare: upload e conversão de vídeo](https://developers.cloudflare.com/use-cases/media-streaming/video-delivery/)
