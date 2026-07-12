import { describe, it, expect } from 'vitest'
import { normalizeItems } from '../services/memoryService.js'

describe('normalizeItems', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeItems(null)).toEqual([])
    expect(normalizeItems(undefined)).toEqual([])
    expect(normalizeItems({})).toEqual([])
    expect(normalizeItems('string')).toEqual([])
  })

  it('filters out invalid items', () => {
    const items = [
      null,
      { id: '1', type: 'note', content: 'valid', tags: [], pinned: false, createdAt: 1000 },
      { type: 'note', content: 'no-id', tags: [], pinned: false, createdAt: 1000 },
      { id: '2', content: 'no type', tags: [], pinned: false, createdAt: 1000 },
    ]
    expect(normalizeItems(items)).toHaveLength(1)
    expect(normalizeItems(items)[0].id).toBe('1')
  })

  it('filters out items without array tags', () => {
    const items = [
      { id: '1', type: 'note', content: 'test', tags: 'not-array', pinned: false, createdAt: 1000 },
      { id: '2', type: 'idea', content: 'test', tags: ['valid'], pinned: false, createdAt: 1000 },
    ]
    const result = normalizeItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['valid'])
  })

  it('converts invalid type to note', () => {
    const items = [{ id: '1', type: 'invalid', content: 'test', tags: [], pinned: false, createdAt: 1000 }]
    expect(normalizeItems(items)[0].type).toBe('note')
  })

  it('normalizes url to empty string when missing', () => {
    const items = [{ id: '1', type: 'note', content: 'test', tags: [], pinned: false, createdAt: 1000 }]
    expect(normalizeItems(items)[0].url).toBe('')
  })

  it('uses createdAt for updatedAt when updatedAt is missing', () => {
    const items = [{ id: '1', type: 'note', content: 'test', tags: [], pinned: false, url: '', createdAt: 1000 }]
    expect(normalizeItems(items)[0].updatedAt).toBe(1000)
  })

  it('preserves updatedAt when provided', () => {
    const items = [{ id: '1', type: 'note', content: 'test', tags: [], pinned: false, url: '', createdAt: 1000, updatedAt: 2000 }]
    expect(normalizeItems(items)[0].updatedAt).toBe(2000)
  })

  it('converts number id to string', () => {
    const items = [{ id: 42, type: 'note', content: 'test', tags: [], pinned: false, createdAt: 1000 }]
    expect(typeof normalizeItems(items)[0].id).toBe('string')
  })
})
