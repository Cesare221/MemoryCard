## Memory depo

Um app pessoal para guardar ideias, notas, links e trechos em um só lugar.

Autor: Cesar Delmondes

## Live demo:
https://memorycard-gold.vercel.app/

## Destaques

- Fundo sutil com a imagem `brain`
- Interface escura com foco em leitura rápida
- Busca instantânea e filtro por tipo
- Persistência local com `localStorage`
- Pronto para Vercel

## O que ele faz

- Cria notas rápidas com um clique
- Separa conteúdos por tipo: nota, ideia, link e trecho
- Permite fixar itens importantes
- Tem busca instantânea
- Salva tudo no navegador com `localStorage`

## Tecnologias

- React
- Vite
- CSS puro

## Como rodar localmente

```bash
npm install
npm run dev
```

## Build para produção

```bash
npm run build
```

## Deploy na Vercel

O projeto já está preparado para Vercel.

1. Suba o código para o GitHub.
2. Importe o repositório na Vercel.
3. Use `npm run vercel-build` como comando de build.
4. O diretório de saída deve ser `dist`.

## Personalização

Se quiser mudar textos, nome ou visual, ajuste principalmente:

- `src/App.jsx`
- `src/styles.css`
- `public/brain.PNG`

## Licença

Projeto pessoal para uso e adaptação livre.
