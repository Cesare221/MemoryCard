const STORAGE_KEY = 'memory-depo-offline-queue'

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function addToQueue(operation) {
  const queue = getQueue()
  queue.push({ ...operation, timestamp: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function flushQueue(processOp) {
  const queue = getQueue()
  if (!queue.length) return
  for (const op of queue) {
    try {
      await processOp(op)
    } catch (e) {
      console.warn('[offline] falha ao processar operação pendente:', op, e)
      return
    }
  }
  clearQueue()
}
