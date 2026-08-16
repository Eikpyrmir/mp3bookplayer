import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getAudio } from '../audio/engine'
import { getDebugEvents, isDebug, logEvent } from '../utils/debug'

function liveState() {
  const st = useAppStore.getState()
  const a = getAudio()
  return {
    status: st.status,
    paused: a.paused,
    volume: a.volume,
    currentTime: a.currentTime.toFixed(1),
    hidden: document.hidden,
    msState: 'mediaSession' in navigator ? navigator.mediaSession.playbackState : 'n/a',
  }
}

type LiveState = ReturnType<typeof liveState>

export function DebugOverlay() {
  const open = useAppStore((s) => s.debugOpen)
  const toggleDebug = useAppStore((s) => s.toggleDebug)
  const [live, setLive] = useState<LiveState>(() => liveState())

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setLive(liveState()), 500)
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!isDebug()) return
    const onError = (e: ErrorEvent) => logEvent(`JS Error: ${e.message} @${e.filename}:${e.lineno}`)
    const onReject = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason)
      logEvent(`unhandledrejection: ${reason}`)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onReject)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onReject)
    }
  }, [])

  if (!open) return null

  const rows: [string, string][] = [
    ['status', live.status],
    ['a.paused', String(live.paused)],
    ['a.volume', String(live.volume)],
    ['a.currentTime', live.currentTime],
    ['hidden', String(live.hidden)],
    ['ms.playbackState', live.msState],
  ]

  return (
    <div className="fixed bottom-16 right-2 z-[70] w-[260px] max-h-[50dvh] overflow-auto rounded-xl border border-slate-700 bg-slate-950/95 p-2 text-[10px] leading-tight text-emerald-300 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-emerald-200">DEBUG</span>
        <button
          type="button"
          onClick={toggleDebug}
          aria-label="閉じる"
          className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-slate-400">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-slate-800 pt-1">
        {getDebugEvents()
          .slice(-8)
          .reverse()
          .map((e, i) => (
            <div key={i} className="truncate text-slate-300">
              <span className="text-slate-600">{e.t}</span> {e.msg}
            </div>
          ))}
      </div>
    </div>
  )
}