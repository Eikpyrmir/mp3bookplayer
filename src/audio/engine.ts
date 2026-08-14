import type { FileNode } from '../types'

let audio: HTMLAudioElement | null = null

export function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
  }
  return audio
}

export async function loadAudio(
  node: FileNode,
  playbackRate: number,
): Promise<{ audio: HTMLAudioElement; file: File }> {
  const a = getAudio()
  a.pause()
  a.playbackRate = playbackRate
  const file = await node.handle.getFile()
  const url = URL.createObjectURL(file)
  if (a.currentSrc) {
    URL.revokeObjectURL(a.currentSrc)
  }
  a.src = url
  return { audio: a, file }
}

interface MediaSessionHandlers {
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrev: () => void
  onSeekTo: (position: number) => void
}

export function setupMediaSession(handlers: MediaSessionHandlers, disablePrevNext: boolean): void {
  if (!('mediaSession' in navigator)) return
  const ms = navigator.mediaSession
  const actions: [MediaSessionAction, MediaSessionActionHandler | null][] = [
    ['play', handlers.onPlay],
    ['pause', handlers.onPause],
    ['previoustrack', disablePrevNext ? null : handlers.onPrev],
    ['nexttrack', disablePrevNext ? null : handlers.onNext],
    ['seekto', (details) => {
      if (typeof details.seekTime === 'number') handlers.onSeekTo(details.seekTime)
    }],
  ]
  for (const [action, handler] of actions) {
    try {
      ms.setActionHandler(action, handler)
    } catch {
      // 対応していないアクションは無視
    }
  }
}

export function updateMediaSession(
  title: string,
  artist: string,
  position: number,
  duration: number,
  playbackRate = 1,
): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist })
  } catch {
    // ignore
  }
  updateMediaSessionPosition(position, duration, playbackRate)
}

export function updateMediaSessionPosition(
  position: number,
  duration: number,
  playbackRate = 1,
): void {
  if (!('mediaSession' in navigator)) return
  const dur = Number.isFinite(duration) && duration > 0 ? duration : 0
  if (dur <= 0) return
  const pos = Number.isFinite(position) ? Math.max(0, Math.min(position, dur)) : 0
  try {
    navigator.mediaSession.setPositionState({
      duration: dur,
      playbackRate,
      position: pos >= dur ? dur - 0.01 : pos,
    })
  } catch {
    // ignore
  }
}

type WakeLock = { release: () => Promise<void> }
let wakeLock: WakeLock | null = null

export async function acquireWakeLock(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLock> } }
    if (!nav.wakeLock || wakeLock) return
    wakeLock = await nav.wakeLock.request('screen')
  } catch {
    // スリープ防止が使えない環境では無視
  }
}

export function releaseWakeLock(): void {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}
