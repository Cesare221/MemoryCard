# MemoryDepo

Aplicação web para capturar notas, ideias, links e referências em um espaço pessoal com busca rápida, organização simples e sincronização com Supabase.

[![React](https://img.shields.io/badge/Frontend-React-111827?style=for-the-badge&logo=react&logoColor=61DAFB)](#stack)
[![Vite](https://img.shields.io/badge/Build-Vite-111827?style=for-the-badge&logo=vite&logoColor=646CFF)](#stack)
[![Supabase](https://img.shields.io/badge/Database-Supabase-111827?style=for-the-badge&logo=supabase&logoColor=3ECF8E)](#stack)

## Stack

- React 19
- Vite
- Supabase (auth + banco Postgres com RLS)
- GSAP (animação do cordão da lâmpada)
- CSS puro
- Vercel

## Setup

1. Crie um projeto no [Supabase](https://supabase.com)

2. Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

3. Execute o SQL de `supabase-migration.sql` no SQL Editor do Supabase para criar a tabela e as políticas RLS.

4. Instale e rode:

```bash
npm install
npm run dev
```

## Funcionalidades

- **Login com Lâmpada**: puxe o cordão para acender e acessar o formulário
- **Cadastro público** com confirmação de e-mail
- **Recuperação de senha** via link enviado por e-mail
- **Migração automática**: ao entrar pela primeira vez, detecta e oferece importar memórias salvas anteriormente no navegador
- **CRUD completo** de memórias (notas, ideias, links, trechos)
- **Busca instantânea** com atalho ⌘K
- **Fixar**, filtrar por tipo e exportar/importar JSON
- **Sincronização em tempo real** com Supabase

## Estrutura

```
src/
  lib/
    supabaseClient.js       # cliente Supabase
  services/
    authService.js          # cadastro, login, logout, recuperação
    memoryService.js        # CRUD de memórias via Supabase
  components/
    LoginScreen.jsx         # tela de login com lâmpada animada
  App.jsx                   # componente principal
  styles.css                # estilos globais
  main.jsx                  # entry point
```

## Build

```bash
npm run build
```
