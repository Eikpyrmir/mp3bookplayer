import { useAppStore, SPEED_PRESETS } from '../store/useAppStore'
import { formatTime } from '../utils/format'
import { SeekBar } from './SeekBar'
import { Marquee } from './Marquee'
import { IconMenu, IconNext, IconPause, IconPlay, IconPrev } from './Icons'

function StatusDot({ status }: { status: string }) {
  if (status === 'playing') {
    return (
      <span className="relative flex h-2.5 w-2.5 flex-none">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
    )
  }
  if (status === 'paused') {
    return <span className="h-2.5 w-2.5 flex-none rounded-full bg-amber-400" />
  }
  return <span className="h-2.5 w-2.5 flex-none rounded-full bg-slate-600" />
}

export function PlayerPanel() {
  const status = useAppStore((s) => s.status)
  const file = useAppStore((s) => s.file)
  const folderPath = useAppStore((s) => s.folderPath)
  const index = useAppStore((s) => s.index)
  const folderCount = useAppStore((s) => s.folderFiles.length)
  const currentTime = useAppStore((s) => s.currentTime)
  const duration = useAppStore((s) => s.duration)
  const speed = useAppStore((s) => s.speed)
  const meta = useAppStore((s) => s.meta)
  const togglePlay = useAppStore((s) => s.togglePlay)
  const seek = useAppStore((s) => s.seek)
  const next = useAppStore((s) => s.next)
  const prev = useAppStore((s) => s.prev)
  const setSpeed = useAppStore((s) => s.setSpeed)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const hasFile = file != null
  const playing = status === 'playing'

  const cycleSpeed = () => {
    const cur = SPEED_PRESETS.findIndex((p) => p === speed)
    const nextSpeed = SPEED_PRESETS[(cur + 1) % SPEED_PRESETS.length]
    setSpeed(nextSpeed)
  }

  return (
    <div className="flex h-full flex-col gap-1.5 px-4 pb-2 pt-4">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={status} />
          <Marquee className="flex-1 text-[17px] font-medium text-slate-100" loop={status === 'playing'}>
            {hasFile ? file.name : '再生するファイルを選択してください'}
          </Marquee>
          <button
            type="button"
            onClick={cycleSpeed}
            className="flex-none rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold tabular-nums text-sky-300"
            title="再生スピード切替"
          >
            {speed.toFixed(2)}×
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2 text-slate-400">
          <Marquee className="flex-1 text-[15px]" loop={status === 'playing'}>
            {hasFile ? folderPath ?? '' : '---'}
          </Marquee>
          <p className="flex-none text-xs tabular-nums">
            {hasFile ? `${index + 1} / ${folderCount}` : '---'}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          {hasFile ? (
            <>
              <span className="tabular-nums">{meta?.codec ?? '—'}</span>
              <span className="text-slate-600">/</span>
              <span className="tabular-nums">
                {meta?.sampleRateHz ? `${(meta.sampleRateHz / 1000).toFixed(1)} kHz` : '—'}
              </span>
              <span className="text-slate-600">/</span>
              <span className="tabular-nums">
                {meta?.bitrateKbps ? `${meta.bitrateKbps} kbps` : '—'}
              </span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      <div className="my-auto">
        <div className="flex items-center px-[5%] py-2">
          <SeekBar value={currentTime} max={duration} disabled={!hasFile} onChange={seek} />
        </div>

        <div className="flex justify-between text-[22px] tabular-nums text-slate-500">
          <span>{hasFile ? formatTime(currentTime) : '--:--'}</span>
          <span>{hasFile ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-1">
        <button
          type="button"
          onClick={prev}
          disabled={!hasFile}
          className="flex h-12 items-center justify-center rounded-xl text-slate-200 transition active:bg-slate-800 disabled:opacity-30"
          title="戻る"
        >
          <IconPrev className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!hasFile}
          className="flex h-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-900/50 transition active:scale-95 disabled:opacity-40"
          title={playing ? '一時停止' : '再生'}
        >
          {playing ? (
            <IconPause className="h-8 w-8" />
          ) : (
            <IconPlay className="ml-1 h-8 w-8" />
          )}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!hasFile}
          className="flex h-12 items-center justify-center rounded-xl text-slate-200 transition active:bg-slate-800 disabled:opacity-30"
          title="進む"
        >
          <IconNext className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex h-12 items-center justify-center rounded-xl text-slate-200 transition active:bg-slate-800"
          title="設定"
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
