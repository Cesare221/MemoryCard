import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addToQueue, getQueue, clearQueue, flushQueue } from '../services/offlineQueue.js'

const store = {}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  })
})

describe('offlineQueue', () => {
  it('returns empty array when no queue', () => {
    expect(getQueue()).toEqual([])
  })

  it('adds operations to queue', () => {
    addToQueue({ type: 'create', data: { content: 'test' } })
    const queue = getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].type).toBe('create')
    expect(queue[0].data.content).toBe('test')
    expect(queue[0].timestamp).toBeDefined()
  })

  it('appends multiple operations', () => {
    addToQueue({ type: 'create', data: { id: '1' } })
    addToQueue({ type: 'update', data: { id: '2' } })
    expect(getQueue()).toHaveLength(2)
  })

  it('clears queue', () => {
    addToQueue({ type: 'create', data: {} })
    clearQueue()
    expect(getQueue()).toEqual([])
  })

  it('flushes queue processing each op', async () => {
    const processed = []
    addToQueue({ type: 'create', data: { id: '1' } })
    addToQueue({ type: 'delete', itemId: '2' })
    await flushQueue(async (op) => { processed.push(op) })
    expect(processed).toHaveLength(2)
    expect(processed[0].type).toBe('create')
    expect(processed[1].type).toBe('delete')
    expect(getQueue()).toEqual([])
  })

  it('stops flushing on error and keeps remaining items', async () => {
    addToQueue({ type: 'create', data: { id: '1' } })
    addToQueue({ type: 'delete', itemId: '2' })
    const processed = []
    await flushQueue(async (op) => {
      processed.push(op)
      if (op.type === 'delete') throw new Error('fail')
    })
    expect(processed).toHaveLength(2)
  })

  it('rejects invalid localStorage data gracefully', () => {
    store['memory-depo-offline-queue'] = 'invalid-json'
    expect(getQueue()).toEqual([])
  })
})
