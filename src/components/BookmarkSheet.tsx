import { useAppStore } from '../store/useAppStore'
import { formatTime } from '../utils/format'
import { Marquee } from './Marquee'
import { IconBookmark, IconX } from './Icons'

export function BookmarkSheet() {
  const open = useAppStore((s) => s.bookmarkOpen)
  const setOpen = useAppStore((s) => s.setBookmarkOpen)
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
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <IconBookmark className="h-5 w-5 text-sky-400" />
              しおり
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              title="閉じる"
            >
              <IconX />
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            タップすると、その位置から再生します
          </p>

          {bookmarks.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-500">
              保存されたしおりはありません
              <br />
              進む/戻るで曲を移動した際に、その時点の位置が自動的に保存されます。
            </p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-slate-700/60 rounded-xl border border-slate-700 bg-slate-800">
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
                      <p className="flex items-center gap-2 text-sm text-slate-200">
                        <span className="min-w-0 flex-1 truncate">{b.title}</span>
                        <span className="flex-none text-xs font-semibold tabular-nums text-sky-400">
                          {formatTime(b.position)}
                        </span>
                      </p>
                      <Marquee className="text-xs text-slate-500" speed={25}>
                        {b.path} ・ 全長 {formatTime(b.duration)}
                      </Marquee>
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
        </div>
      </div>
    </div>
  )
}
