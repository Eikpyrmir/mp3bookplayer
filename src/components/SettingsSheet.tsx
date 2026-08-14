import { useAppStore, SPEED_PRESETS } from '../store/useAppStore'
import { formatTime } from '../utils/format'
import { IconX } from './Icons'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-5 text-xs font-semibold tracking-wide text-slate-400 first:mt-0">
      {children}
    </h3>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
        checked ? 'bg-sky-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function SettingsSheet() {
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const speed = useAppStore((s) => s.speed)
  const setSpeed = useAppStore((s) => s.setSpeed)
  const continuous = useAppStore((s) => s.continuous)
  const setContinuous = useAppStore((s) => s.setContinuous)
  const root = useAppStore((s) => s.root)
  const permissionState = useAppStore((s) => s.permissionState)
  const chooseRoot = useAppStore((s) => s.chooseRoot)
  const bookmarks = useAppStore((s) => s.bookmarks)
  const playBookmark = useAppStore((s) => s.playBookmark)
  const removeBookmark = useAppStore((s) => s.removeBookmark)
  const removeAllBookmarks = useAppStore((s) => s.removeAllBookmarks)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 pb-6">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700" />
        <div className="px-5">
          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">設定</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              title="閉じる"
            >
              <IconX />
            </button>
          </div>

          <SectionTitle>再生スピード</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSpeed(p)}
                className={`rounded-xl border px-2 py-2 text-sm font-medium tabular-nums transition ${
                  p === speed
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                {p.toFixed(2)}×
              </button>
            ))}
          </div>

          <SectionTitle>連続再生</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
            <div>
              <p className="text-sm text-slate-200">フォルダ内を自動で次のファイルへ</p>
              <p className="mt-0.5 text-xs text-slate-500">最後のファイルで再生を停止します</p>
            </div>
            <Toggle checked={continuous} onChange={setContinuous} />
          </div>

          <SectionTitle>フォルダ</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-200">
                {root ? root.name : '未選択'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                権限:{' '}
                {permissionState === 'granted'
                  ? 'アクセス可'
                  : permissionState === 'prompt'
                    ? '未確認'
                    : '拒否/未許可'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                chooseRoot()
              }}
              className="flex-none rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white active:bg-sky-800"
            >
              フォルダを選択
            </button>
          </div>

          <SectionTitle>再生位置(しおり)</SectionTitle>
          {bookmarks.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-500">
              保存された再生位置はありません
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-700/60 rounded-xl border border-slate-700 bg-slate-800">
                {bookmarks.map((b) => (
                  <li key={b.path} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        playBookmark(b.path, b.position)
                      }}
                      className="min-w-0 flex-1 px-4 py-2.5 text-left transition hover:bg-slate-700/40 active:bg-slate-700/60"
                      title="この位置から再生"
                    >
                      <p className="truncate text-sm text-slate-200">{b.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {b.path} ・ {formatTime(b.position)} / {formatTime(b.duration)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(b.path)}
                      className="mr-2 flex-none rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-slate-700"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={removeAllBookmarks}
                className="mt-2 w-full rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:bg-red-900/30"
              >
                すべて削除
              </button>
            </>
          )}

          <SectionTitle>アプリ情報</SectionTitle>
          <p className="text-xs text-slate-500">
            MP3 オーディオブックプレイヤー v1.0.0
            <br />
            対応形式: MP3 / M4A / AAC / FLAC / OGG / OPUS / WAV
          </p>
        </div>
      </div>
    </div>
  )
}
