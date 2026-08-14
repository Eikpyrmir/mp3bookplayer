import { create } from 'zustand'
import type { Bookmark, FileNode, FolderNode, PlayerStatus, TreeNode } from '../types'
import {
  clearAllBookmarks,
  deleteBookmark,
  getAllBookmarks,
  getBookmark,
  loadRootHandle,
  saveBookmark,
  saveRootHandle,
} from '../db/db'
import {
  ensureReadPermission,
  pickRootDirectory,
  readFolderChildren,
} from '../fs/folderAccess'
import { parseAudioMeta } from '../fs/audioMeta'
import type { AudioMeta } from '../fs/audioMeta'
import {
  acquireWakeLock,
  getAudio,
  loadAudio,
  releaseWakeLock,
  setupMediaSession,
  updateMediaSession,
} from '../audio/engine'

const SPEED_KEY = 'abp.speed'
const CONTINUOUS_KEY = 'abp.continuous'

export const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

let wired = false
let pendingResume: number | null = null
let lastTimeUpdate = 0
let bookmarkTimer: number | null = null

function setMediaPlayback(state: 'playing' | 'paused') {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state
  }
}

function saveNow() {
  const st = useAppStore.getState()
  if (st.file && st.status !== 'idle') {
    saveBookmark({
      path: st.file.path,
      title: st.file.name,
      position: st.currentTime,
      duration: st.duration,
      speed: st.speed,
      updatedAt: Date.now(),
    })
  }
  saveLastPlayback()
}

const LAST_KEY = 'abp.lastPlayback'

interface LastPlayback {
  rootName: string
  filePath: string
  updatedAt: number
}

function saveLastPlayback() {
  const st = useAppStore.getState()
  if (!st.file || !st.root) return
  try {
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({
        rootName: st.root.name,
        filePath: st.file.path,
        updatedAt: Date.now(),
      } satisfies LastPlayback),
    )
  } catch {
    // ignore
  }
}

function readLastPlayback(): LastPlayback | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as LastPlayback) : null
  } catch {
    return null
  }
}

function parentFolderPath(filePath: string): string {
  const idx = filePath.lastIndexOf('/')
  return idx === -1 ? '' : filePath.slice(0, idx)
}

function findFolder(node: FolderNode, path: string): FolderNode | null {
  if (node.path === path) return node
  for (const child of node.children) {
    if (child.kind === 'folder') {
      const found = findFolder(child, path)
      if (found) return found
    }
  }
  return null
}

function updateFolderChildren(
  node: FolderNode,
  path: string,
  children: TreeNode[],
): FolderNode {
  if (node.path === path) {
    return { ...node, children, loaded: true }
  }
  return {
    ...node,
    children: node.children.map((c) =>
      c.kind === 'folder' ? updateFolderChildren(c, path, children) : c,
    ),
  }
}

function collectFiles(folder: FolderNode | null): FileNode[] {
  if (!folder) return []
  return folder.children.filter((c): c is FileNode => c.kind === 'file')
}

async function ensureFolderChainLoaded(
  root: FolderNode,
  path: string,
): Promise<FolderNode> {
  let updated = root
  if (!root.loaded) {
    const children = await readFolderChildren(root.handle, '')
    updated = updateFolderChildren(updated, '', children)
  }
  const parts = path.split('/').filter(Boolean)
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    const current = findFolder(updated, acc)
    if (current && !current.loaded) {
      const children = await readFolderChildren(current.handle, acc)
      updated = updateFolderChildren(updated, acc, children)
    }
  }
  return updated
}

interface AppState {
  root: FolderNode | null
  rootReady: boolean
  permissionState: PermissionState | null
  pendingRoot: FileSystemDirectoryHandle | null
  expanded: Record<string, boolean>

  status: PlayerStatus
  file: FileNode | null
  folderPath: string | null
  folderFiles: FileNode[]
  index: number
  currentTime: number
  duration: number
  speed: number
  continuous: boolean
  resumeBanner: { position: number; title: string } | null
  meta: AudioMeta | null
  error: string | null
  settingsOpen: boolean
  bookmarks: Bookmark[]

  init: () => Promise<void>
  restoreLastPlayback: () => Promise<void>
  restorePermission: () => Promise<void>
  chooseRoot: () => Promise<void>
  refreshRoot: () => Promise<void>
  loadFolder: (path: string) => Promise<void>
  toggleFolder: (path: string) => Promise<void>
  playNode: (filePath: string) => Promise<void>
  playBookmark: (path: string, position: number) => Promise<void>
  playIndex: (i: number, seekTo?: number) => Promise<void>
  togglePlay: () => void
  seek: (t: number) => void
  next: () => void
  prev: () => void
  setSpeed: (s: number) => void
  setContinuous: (b: boolean) => void
  dismissResumeBanner: () => void
  playFromBeginning: () => void
  setSettingsOpen: (open: boolean) => void
  refreshBookmarks: () => Promise<void>
  removeBookmark: (path: string) => Promise<void>
  removeAllBookmarks: () => Promise<void>
  clearError: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  root: null,
  rootReady: false,
  permissionState: null,
  pendingRoot: null,
  expanded: {},

  status: 'idle',
  file: null,
  folderPath: null,
  folderFiles: [],
  index: 0,
  currentTime: 0,
  duration: 0,
  speed: Number(localStorage.getItem(SPEED_KEY)) || 1,
  continuous: localStorage.getItem(CONTINUOUS_KEY) !== '0',
  resumeBanner: null,
  meta: null,
  error: null,
  settingsOpen: false,
  bookmarks: [],

  init: async () => {
    const a = getAudio()
    if (!wired) {
      wired = true
      a.addEventListener('timeupdate', () => {
        const now = performance.now()
        if (now - lastTimeUpdate < 200) return
        lastTimeUpdate = now
        useAppStore.setState({ currentTime: a.currentTime })
      })
      a.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(a.duration) ? a.duration : 0
        let resume: number | null = null
        if (pendingResume != null) {
          a.currentTime = pendingResume
          resume = pendingResume
          pendingResume = null
        }
        const st = useAppStore.getState()
        let meta = st.meta
        if (meta && meta.bitrateKbps == null && meta.bytes > 0 && duration > 0) {
          const est = Math.round((meta.bytes * 8) / duration / 1000)
          if (est > 0) meta = { ...meta, bitrateKbps: est }
        }
        useAppStore.setState({
          duration,
          currentTime: resume ?? 0,
          meta,
          resumeBanner: resume != null && st.file
            ? { position: resume, title: st.file.name }
            : null,
        })
        updateMediaSession(st.file?.name ?? '', st.folderPath ?? '', resume ?? 0, duration)
      })
      a.addEventListener('ended', () => {
        const st = useAppStore.getState()
        if (st.file) {
          saveBookmark({
            path: st.file.path,
            title: st.file.name,
            position: 0,
            duration: st.duration,
            speed: st.speed,
            updatedAt: Date.now(),
          })
        }
        if (st.continuous && st.index < st.folderFiles.length - 1) {
          st.playIndex(st.index + 1)
        } else {
          setMediaPlayback('paused')
          releaseWakeLock()
          useAppStore.setState({ status: 'idle', currentTime: 0 })
        }
      })
      a.addEventListener('error', () => {
        useAppStore.setState({ status: 'idle', error: 'ファイルを読み込めませんでした' })
      })
      setupMediaSession({
        onPlay: () => get().togglePlay(),
        onPause: () => get().togglePlay(),
        onNext: () => get().next(),
        onPrev: () => get().prev(),
        onSeekTo: (position) => get().seek(position),
      })
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          saveNow()
        } else if (get().status === 'playing') {
          acquireWakeLock()
        }
      })
      window.addEventListener('pagehide', () => saveNow())
    }
    if (bookmarkTimer == null) {
      bookmarkTimer = window.setInterval(() => saveNow(), 5000)
    }

    const handle = await loadRootHandle()
    if (handle) {
      let state: PermissionState = 'denied'
      try {
        state = await ensureReadPermission(handle, false)
        if (state !== 'granted') {
          state = await ensureReadPermission(handle, true)
        }
      } catch {
        // ジェスチャーなしの権限要求が失敗する環境では、再選択を促す
        state = 'denied'
      }
      if (state === 'granted') {
        set({
          root: {
            kind: 'folder',
            name: handle.name,
            path: '',
            handle,
            loaded: false,
            children: [],
          },
          expanded: { '': true },
          permissionState: 'granted',
        })
        await get().restoreLastPlayback()
      } else {
        // 権限はユーザーの操作(タップ)がないと復元できないため、
        // 保存済みハンドルを保持し、画面のボタンから復元できるようにする
        set({ permissionState: state, root: null, pendingRoot: handle })
      }
    }
    set({ rootReady: true })
  },

  restorePermission: async () => {
    const { pendingRoot } = get()
    if (!pendingRoot) return
    try {
      const state = await ensureReadPermission(pendingRoot, true)
      if (state !== 'granted') {
        set({
          permissionState: state,
          error: 'アクセス権限を復元できませんでした。フォルダを選択し直してください',
        })
        return
      }
      set({
        root: {
          kind: 'folder',
          name: pendingRoot.name,
          path: '',
          handle: pendingRoot,
          loaded: false,
          children: [],
        },
        expanded: { '': true },
        permissionState: 'granted',
        pendingRoot: null,
      })
      await get().restoreLastPlayback()
    } catch {
      set({
        error: 'アクセス権限を復元できませんでした。フォルダを選択し直してください',
      })
    }
  },

  restoreLastPlayback: async () => {
    const { root, folderFiles } = get()
    if (!root || folderFiles.length > 0) return
    const saved = readLastPlayback()
    if (!saved || saved.rootName !== root.name) return
    const filePath = saved.filePath
    const folderPath = parentFolderPath(filePath)
    try {
      let updated = await ensureFolderChainLoaded(root, folderPath)
      const folder = findFolder(updated, folderPath)
      const files = collectFiles(folder)
      const index = files.findIndex((f) => f.path === filePath)
      if (index < 0) return
      const parts = folderPath.split('/').filter(Boolean)
      let acc = ''
      const toExpand: Record<string, boolean> = { '': true }
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part
        toExpand[acc] = true
      }
      set({
        root: updated,
        folderFiles: files,
        folderPath,
        index,
        expanded: { ...get().expanded, ...toExpand },
      })
      const node = files[index]
      if (node) {
        await loadAudio(node, get().speed)
        set({ file: node, meta: null, error: null })
      }
    } catch {
      // 復元に失敗しても再生は可能なので無視
    }
  },

  chooseRoot: async () => {
    try {
      const handle = await pickRootDirectory()
      if (!handle) return
      const state = await ensureReadPermission(handle, true)
      if (state !== 'granted') {
        set({ error: 'フォルダへのアクセス権限がありません', permissionState: state })
        return
      }
      const a = getAudio()
      a.pause()
      if (a.currentSrc) URL.revokeObjectURL(a.currentSrc)
      a.removeAttribute('src')
      releaseWakeLock()
      set({
        status: 'idle',
        file: null,
        folderPath: null,
        folderFiles: [],
        index: 0,
        currentTime: 0,
        duration: 0,
        resumeBanner: null,
        meta: null,
        root: {
          kind: 'folder',
          name: handle.name,
          path: '',
          handle,
          loaded: false,
          children: [],
        },
        expanded: { '': true },
        permissionState: 'granted',
        pendingRoot: null,
      })
      saveRootHandle(handle)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      set({ error: e instanceof Error ? e.message : 'フォルダを選択できませんでした' })
    }
  },

  refreshRoot: async () => {
    const { root } = get()
    if (!root) return
    try {
      const state = await ensureReadPermission(root.handle, true)
      if (state !== 'granted') {
        set({ error: 'フォルダへのアクセス権限がありません', permissionState: state })
        return
      }
      set({ root: { ...root, loaded: false, children: [] } })
      const children = await readFolderChildren(root.handle, '')
      set((s) => ({
        root: s.root ? updateFolderChildren(s.root, '', children) : s.root,
      }))
    } catch {
      set({ error: 'フォルダを読み込めませんでした。権限が失効している可能性があります' })
    }
  },

  loadFolder: async (path) => {
    const { root } = get()
    if (!root) return
    const node = findFolder(root, path)
    if (!node || node.loaded) return
    try {
      const children = await readFolderChildren(node.handle, path)
      set((s) => ({
        root: s.root ? updateFolderChildren(s.root, path, children) : s.root,
      }))
    } catch {
      const st = get()
      let state: PermissionState = 'denied'
      try {
        state = await ensureReadPermission(st.root?.handle ?? node.handle, false)
      } catch {
        state = 'denied'
      }
      if (state !== 'granted') {
        set({
          permissionState: state,
          root: null,
          pendingRoot: st.root?.handle ?? node.handle,
        })
      } else {
        set({ error: 'フォルダを読み込めませんでした' })
      }
    }
  },

  toggleFolder: async (path) => {
    const { expanded } = get()
    const open = !expanded[path]
    set({ expanded: { ...expanded, [path]: open } })
    if (open) await get().loadFolder(path)
  },

  playNode: async (filePath) => {
    const { root } = get()
    if (!root) return
    const folderPath = parentFolderPath(filePath)
    let updated = root
    try {
      updated = await ensureFolderChainLoaded(root, folderPath)
    } catch {
      set({ error: 'フォルダを読み込めませんでした。権限が失効している可能性があります' })
      return
    }
    const folder = findFolder(updated, folderPath)
    const files = collectFiles(folder)
    const index = files.findIndex((f) => f.path === filePath)
    if (index < 0) return
    const parts = folderPath.split('/').filter(Boolean)
    let acc = ''
    const toExpand: Record<string, boolean> = { '': true }
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      toExpand[acc] = true
    }
    set({
      root: updated,
      folderFiles: files,
      folderPath,
      expanded: { ...get().expanded, ...toExpand },
    })
    await get().playIndex(index)
  },

  playBookmark: async (path, position) => {
    const { root } = get()
    if (!root) return
    const folderPath = parentFolderPath(path)
    try {
      let updated = await ensureFolderChainLoaded(root, folderPath)
      const folder = findFolder(updated, folderPath)
      const files = collectFiles(folder)
      const index = files.findIndex((f) => f.path === path)
      if (index < 0) return
      const parts = folderPath.split('/').filter(Boolean)
      let acc = ''
      const toExpand: Record<string, boolean> = { '': true }
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part
        toExpand[acc] = true
      }
      set({
        root: updated,
        folderFiles: files,
        folderPath,
        expanded: { ...get().expanded, ...toExpand },
      })
      await get().playIndex(index, position)
    } catch {
      set({ error: 'フォルダを読み込めませんでした。権限が失効している可能性があります' })
    }
  },

  playIndex: async (i, seekTo) => {
    const { folderFiles, speed, folderPath } = get()
    if (i < 0 || i >= folderFiles.length) return
    const node = folderFiles[i]
    try {
      const { audio, file } = await loadAudio(node, speed)
      const meta = await parseAudioMeta(node.name, file)
      if (seekTo != null) {
        pendingResume = seekTo
      } else {
        const bm = await getBookmark(node.path)
        pendingResume =
          bm && bm.position >= 5 && bm.duration > 0 && bm.position < bm.duration - 15
            ? bm.position
            : null
      }
      set({
        file: node,
        index: i,
        currentTime: 0,
        duration: 0,
        resumeBanner: null,
        meta,
        error: null,
      })
      updateMediaSession(node.name, folderPath ?? '', 0, 0)
      setMediaPlayback('playing')
      await audio.play()
      acquireWakeLock()
      set({ status: 'playing' })
    } catch (e) {
      set({ status: 'idle', error: e instanceof Error ? e.message : '再生に失敗しました' })
    }
  },

  togglePlay: () => {
    const st = get()
    const a = getAudio()
    if (st.status === 'playing') {
      a.pause()
      saveNow()
      releaseWakeLock()
      setMediaPlayback('paused')
      set({ status: 'paused' })
    } else if (st.status === 'paused') {
      a.playbackRate = st.speed
      a.play()
        .then(() => {
          acquireWakeLock()
          setMediaPlayback('playing')
          set({ status: 'playing' })
        })
        .catch(() => set({ status: 'paused', error: '再生できませんでした' }))
    } else if (st.status === 'idle' && st.file) {
      a.playbackRate = st.speed
      getBookmark(st.file.path).then((bm) => {
        const pos =
          bm && bm.position >= 5 && bm.duration > 0 && bm.position < bm.duration - 15
            ? bm.position
            : 0
        a.currentTime = pos
        a.play()
          .then(() => {
            acquireWakeLock()
            setMediaPlayback('playing')
            set({ status: 'playing', currentTime: pos })
          })
          .catch(() => set({ status: 'idle', error: '再生できませんでした' }))
      })
    }
  },

  seek: (t) => {
    const a = getAudio()
    const { duration } = get()
    const max = Number.isFinite(duration) ? duration : Number.MAX_SAFE_INTEGER
    const clamped = Math.max(0, Math.min(t, max))
    if (Number.isFinite(a.duration) && a.duration > 0) {
      a.currentTime = clamped
    }
    set({ currentTime: clamped })
  },

  next: () => {
    const st = get()
    if (st.index < st.folderFiles.length - 1) {
      saveNow()
      st.playIndex(st.index + 1)
    } else if (st.status !== 'idle') {
      const a = getAudio()
      a.pause()
      releaseWakeLock()
      setMediaPlayback('paused')
      set({ status: 'idle', currentTime: 0 })
    }
  },

  prev: () => {
    const st = get()
    if (st.currentTime > 3) {
      st.seek(0)
    } else if (st.index > 0) {
      saveNow()
      st.playIndex(st.index - 1)
    } else {
      st.seek(0)
    }
  },

  setSpeed: (s) => {
    const a = getAudio()
    a.playbackRate = s
    localStorage.setItem(SPEED_KEY, String(s))
    set({ speed: s })
  },

  setContinuous: (b) => {
    localStorage.setItem(CONTINUOUS_KEY, b ? '1' : '0')
    set({ continuous: b })
  },

  dismissResumeBanner: () => set({ resumeBanner: null }),

  playFromBeginning: () => {
    get().seek(0)
    set({ resumeBanner: null })
  },

  setSettingsOpen: (open) => {
    set({ settingsOpen: open })
    if (open) get().refreshBookmarks()
  },

  refreshBookmarks: async () => {
    const list = await getAllBookmarks()
    list.sort((a, b) => b.updatedAt - a.updatedAt)
    set({ bookmarks: list })
  },

  removeBookmark: async (path) => {
    await deleteBookmark(path)
    await get().refreshBookmarks()
  },

  removeAllBookmarks: async () => {
    await clearAllBookmarks()
    await get().refreshBookmarks()
  },

  clearError: () => set({ error: null }),
}))
