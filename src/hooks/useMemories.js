import { useState, useCallback, useEffect, useRef } from 'react'
import { loadItems as loadRemoteItems, createItem as createRemoteItem, updateItem as updateRemoteItem, deleteItem as deleteRemoteItem } from '../services/memoryService'
import { addToQueue, flushQueue, getQueue } from '../services/offlineQueue'

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useMemories(session) {
  const [items, setItems] = useState([])
  const [syncStatus, setSyncStatus] = useState('idle')
  const [recentlyDeleted, setRecentlyDeleted] = useState(null)
  const undoRef = useRef(null)
  const localCacheKey = session?.id ? `memory-depo-items-${session.id}` : null

  const loadLocalCache = useCallback(() => {
    if (!localCacheKey) return null
    try {
      const raw = localStorage.getItem(localCacheKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [localCacheKey])

  const saveLocalCache = useCallback((newItems) => {
    if (!localCacheKey) return
    try {
      localStorage.setItem(localCacheKey, JSON.stringify(newItems))
    } catch { /* quota exceeded */ }
  }, [localCacheKey])

  const loadItems = useCallback(async () => {
    if (!session) return
    setSyncStatus('saving')
    const cached = loadLocalCache()
    if (cached) setItems(cached)

    const pending = getQueue()
    if (pending.length) {
      await flushQueue(async (op) => {
        switch (op.type) {
          case 'create':
            await createRemoteItem(op.data, session.id)
            break
          case 'update':
            await updateRemoteItem(op.data)
            break
          case 'delete':
            await deleteRemoteItem(op.itemId)
            break
        }
      })
    }

    try {
      const remote = await loadRemoteItems(session.id)
      setItems(remote)
      saveLocalCache(remote)
      setSyncStatus('idle')
    } catch {
      if (!cached) setSyncStatus('error')
      else setSyncStatus('idle')
    }
  }, [session, loadLocalCache, saveLocalCache])

  useEffect(() => {
    if (session) loadItems()
    else {
      setItems([])
      setSyncStatus('idle')
    }
  }, [session, loadItems])

  const addItem = useCallback(async (type, content, tags, url, imageData = '') => {
    if (!session) return
    const now = Date.now()
    const newItem = { id: createId(), type, content, url: url || '', imageData: imageData || '', tags: tags || [], pinned: false, user_id: session.id, createdAt: now, updatedAt: now }
    setItems(prev => [newItem, ...prev])
    setSyncStatus('saving')

    try {
      await createRemoteItem(newItem, session.id)
      saveLocalCache([newItem, ...items])
      setSyncStatus('idle')
    } catch {
      setItems(prev => prev.filter(i => i.id !== newItem.id))
      addToQueue({ type: 'create', data: newItem })
      setSyncStatus('error')
    }
  }, [session, items, saveLocalCache])

  const deleteItem = useCallback((item) => {
    setRecentlyDeleted(item)
    setItems(prev => prev.filter(i => i.id !== item.id))

    if (undoRef.current) clearTimeout(undoRef.current)
    undoRef.current = setTimeout(async () => {
      setRecentlyDeleted(null)
      if (!session) return
      try {
        await deleteRemoteItem(item.id)
        saveLocalCache(items.filter(i => i.id !== item.id))
      } catch {
        addToQueue({ type: 'delete', itemId: item.id })
      }
    }, 5000)
  }, [session, items, saveLocalCache])

  const undoDelete = useCallback(() => {
    if (!recentlyDeleted) return
    if (undoRef.current) clearTimeout(undoRef.current)
    setItems(prev => [recentlyDeleted, ...prev])
    setRecentlyDeleted(null)
  }, [recentlyDeleted])

  const updateItem = useCallback(async (id, data) => {
    const prevItems = items
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    setSyncStatus('saving')
    const item = items.find(i => i.id === id)
    if (!item) return
    const updated = { ...item, ...data, user_id: session?.id }
    try {
      await updateRemoteItem(updated)
      saveLocalCache(items.map(i => i.id === id ? updated : i))
      setSyncStatus('idle')
    } catch {
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
      addToQueue({ type: 'update', data: updated })
      setSyncStatus('error')
    }
  }, [items, session, saveLocalCache])

  const pendingCount = getQueue().length

  return {
    items,
    setItems,
    syncStatus,
    recentlyDeleted,
    pendingCount,
    addItem,
    deleteItem,
    undoDelete,
    updateItem,
    loadItems,
    saveLocalCache,
  }
}
