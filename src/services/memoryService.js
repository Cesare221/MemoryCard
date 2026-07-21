import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'memory_items'

const VALID_TYPES = {
  note: true,
  idea: true,
  link: true,
  snippet: true,
}

export function normalizeItems(value) {
  if (!Array.isArray(value)) return []

  return value.filter((item) => {
    return item
      && typeof item === 'object'
      && (typeof item.id === 'string' || typeof item.id === 'number')
      && typeof item.type === 'string'
      && typeof item.content === 'string'
      && Array.isArray(item.tags)
      && typeof item.pinned === 'boolean'
      && typeof item.createdAt === 'number'
  }).map((item) => ({
    ...item,
    id: String(item.id),
    type: VALID_TYPES[item.type] ? item.type : 'note',
    url: typeof item.url === 'string' ? item.url : '',
    imageData: typeof item.imageData === 'string' ? item.imageData : '',
    tags: item.tags.filter((tag) => typeof tag === 'string'),
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : item.createdAt,
  }))
}

function toRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    content: item.content,
    url: item.url || '',
    image_data: item.imageData || '',
    tags: item.tags || [],
    pinned: item.pinned || false,
    created_at: item.createdAt,
    updated_at: item.updatedAt ?? item.createdAt,
  }
}

function fromRow(row) {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    url: row.url || '',
    imageData: row.image_data || '',
    tags: row.tags || [],
    pinned: row.pinned || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function loadItems(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return normalizeItems((data || []).map(fromRow))
}

export async function createItem(item, userId) {
  const row = toRow(item, userId)
  const { error } = await supabase.from(TABLE).insert(row)
  if (error) throw new Error(error.message)
}

export async function updateItem(item) {
  const { error } = await supabase
    .from(TABLE)
    .update({
      type: item.type,
      content: item.content,
      url: item.url || '',
      image_data: item.imageData || '',
      tags: item.tags || [],
      pinned: item.pinned || false,
      updated_at: item.updatedAt ?? Date.now(),
    })
    .eq('id', item.id)
    .eq('user_id', item.user_id)

  if (error) throw new Error(error.message)
}

export async function deleteItem(itemId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}
