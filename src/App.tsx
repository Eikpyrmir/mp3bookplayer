import { useEffect } from 'react'
import { PlayerPanel } from './components/PlayerPanel'
import { TreePanel } from './components/TreePanel'
import { SettingsSheet } from './components/SettingsSheet'
import { BookmarkSheet } from './components/BookmarkSheet'
import { DebugOverlay } from './components/DebugOverlay'
import { useAppStore } from './store/useAppStore'

function ErrorToast() {
  const error = useAppStore((s) => s.error)
  const clearError = useAppStore((s) => s.clearError)

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(clearError, 6000)
    return () => window.clearTimeout(timer)
  }, [error, clearError])

  if (!error) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] flex items-center gap-3 rounded-xl border border-red-800 bg-red-950/95 px-4 py-3 text-sm text-red-200 shadow-xl">
      <span className="min-w-0 flex-1">{error}</span>
      <button
        type="button"
        onClick={clearError}
        className="flex-none rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-900/50"
      >
        閉じる
      </button>
    </div>
  )
}

export default function App() {
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      <main className="h-[40%] flex-none border-b border-slate-800">
        <PlayerPanel />
      </main>
      <section className="h-[60%] min-h-0 flex-1">
        <TreePanel />
      </section>
      <SettingsSheet />
      <BookmarkSheet />
      <ErrorToast />
      <DebugOverlay />
    </div>
  )
}