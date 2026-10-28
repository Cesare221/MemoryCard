// @vitest-environment node
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test, expect, vi } from 'vitest'

function worker() {
  const handlers = {}
  const cache = { add: vi.fn().mockResolvedValue(), match: vi.fn().mockResolvedValue(new Response('offline')) }
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['other-app', 'memory-depo-offline-v0', 'memory-depo-offline-v1']), delete: vi.fn().mockResolvedValue(true) }
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { addEventListener: (name, fn) => { handlers[name] = fn }, location: { origin: 'https://example.com' }, clients: { claim: vi.fn() } },
    caches, fetch, URL, Response,
  })
  return { handlers, cache, caches, fetch }
}

test('precaches only the offline page and cleans only owned obsolete caches', async () => {
  const { handlers, cache, caches } = worker()
  await handlers.install({ waitUntil: (promise) => promise })
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(cache.add).toHaveBeenCalledWith('/offline.html')
  let activation
  handlers.activate({ waitUntil: (promise) => { activation = promise } })
  await activation
  expect(caches.delete).toHaveBeenCalledTimes(1)
  expect(caches.delete).toHaveBeenCalledWith('memory-depo-offline-v0')
})

test('serves fallback on navigation failure, without caching URL tokens', async () => {
  const { handlers, cache } = worker()
  let response
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/?code=private' }, respondWith: (promise) => { response = promise } })
  expect(await (await response).text()).toBe('offline')
  expect(cache.add).not.toHaveBeenCalled()
})

test('does not intercept Supabase requests or non-navigation resources', () => {
  const { handlers, fetch } = worker()
  const respondWith = vi.fn()
  for (const request of [
    { method: 'GET', mode: 'cors', url: 'https://project.supabase.co/auth/v1/user' },
    { method: 'POST', mode: 'cors', url: 'https://project.supabase.co/auth/v1/token' },
    { method: 'GET', mode: 'cors', url: 'https://example.com/assets/app.js' },
  ]) handlers.fetch({ request, respondWith })
  expect(respondWith).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})
