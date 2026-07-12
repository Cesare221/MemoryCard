-- Migration: create memory_items table and RLS policies
-- Execute this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'idea', 'link', 'snippet')),
  content TEXT NOT NULL,
  url TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_id ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_updated_at ON memory_items(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

-- Policy: users can only SELECT their own items
CREATE POLICY select_own_items ON memory_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can only INSERT their own items
CREATE POLICY insert_own_items ON memory_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can only UPDATE their own items
CREATE POLICY update_own_items ON memory_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: users can only DELETE their own items
CREATE POLICY delete_own_items ON memory_items
  FOR DELETE
  USING (auth.uid() = user_id);
