const MAX_EVENTS = 30

interface DebugEvent {
  t: string
  msg: string
}

const events: DebugEvent[] = []

export function isDebug(): boolean {
  return (
    new URLSearchParams(location.search).has('debug') ||
    localStorage.getItem('abp.debug') === '1'
  )
}

export function logEvent(msg: string): void {
  const ev: DebugEvent = { t: new Date().toLocaleTimeString('ja-JP'), msg }
  events.push(ev)
  if (events.length > MAX_EVENTS) events.shift()
  console.log('[abp]', msg)
}

export function getDebugEvents(): DebugEvent[] {
  return [...events]
}
