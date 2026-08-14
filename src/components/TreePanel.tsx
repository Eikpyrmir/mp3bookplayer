import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { FolderNode, TreeNode } from '../types'
import { formatTime } from '../utils/format'
import {
  IconChevron,
  IconFolder,
  IconFolderSelect,
  IconMusic,
  IconPause,
  IconPlay,
  IconRefresh,
  IconX,
} from './Icons'

function FolderRow({ node, depth }: { node: FolderNode; depth: number }) {
  const expanded = useAppStore((s) => !!s.expanded[node.path])
  const toggleFolder = useAppStore((s) => s.toggleFolder)
  const loadFolder = useAppStore((s) => s.loadFolder)
  const loaded = node.loaded

  useEffect(() => {
    if (expanded && !loaded) loadFolder(node.path)
  }, [expanded, loaded, loadFolder, node.path])

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleFolder(node.path)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800/70"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <IconChevron
          className={`h-4 w-4 flex-none text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <IconFolder open={expanded} className="h-5 w-5 flex-none text-sky-400" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
      </button>
      {expanded && !node.loaded && (
        <div
          className="px-2 py-1.5 text-xs text-slate-500"
          style={{ paddingLeft: `${depth * 16 + 34}px` }}
        >
          読み込み中...
        </div>
      )}
      {expanded &&
        node.loaded &&
        node.children.map((child) => (
          <TreeNodeView key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  )
}

function FileRow({ node, depth }: { node: Extract<TreeNode, { kind: 'file' }>; depth: number }) {
  const currentPath = useAppStore((s) => s.file?.path)
  const status = useAppStore((s) => s.status)
  const playNode = useAppStore((s) => s.playNode)
  const isCurrent = currentPath === node.path

  return (
    <button
      type="button"
      data-path={node.path}
      onClick={() => playNode(node.path)}
      className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-2.5 text-left text-sm transition ${
        isCurrent
          ? 'bg-sky-900/60 text-sky-200'
          : 'text-slate-300 hover:bg-slate-800/70'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <span className="w-4 flex-none" />
      <IconMusic
        className={`h-5 w-5 flex-none ${isCurrent ? 'text-sky-400' : 'text-slate-500'}`}
      />
      <span className={`min-w-0 flex-1 truncate ${isCurrent ? 'font-medium' : ''}`}>
        {node.name}
      </span>
      {isCurrent && status === 'playing' && <IconPlay className="h-4 w-4 flex-none text-sky-400" />}
      {isCurrent && status === 'paused' && <IconPause className="h-4 w-4 flex-none text-amber-400" />}
    </button>
  )
}

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  if (node.kind === 'folder') return <FolderRow node={node} depth={depth} />
  return <FileRow node={node} depth={depth} />
}

function ResumeBanner() {
  const resumeBanner = useAppStore((s) => s.resumeBanner)
  const dismiss = useAppStore((s) => s.dismissResumeBanner)
  const playFromBeginning = useAppStore((s) => s.playFromBeginning)
  if (!resumeBanner) return null
  return (
    <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-sky-800 bg-slate-900/95 px-3 py-2 text-xs shadow-lg">
      <span className="min-w-0 flex-1 truncate text-slate-300">
        {resumeBanner.title}: {formatTime(resumeBanner.position)} から再開中
      </span>
      <button
        type="button"
        onClick={playFromBeginning}
        className="flex-none rounded-lg bg-sky-700 px-2 py-1 text-sky-100"
      >
        先頭から
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="flex-none rounded-lg p-1 text-slate-400 hover:bg-slate-800"
        title="閉じる"
      >
        <IconX />
      </button>
    </div>
  )
}

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <IconFolderSelect className="h-16 w-16 text-sky-500/80" />
      <div>
        <p className="text-sm font-medium text-slate-200">再生するフォルダを選択してください</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          対応形式: MP3 / M4A / AAC / FLAC / OGG / OPUS / WAV
          <br />
          選択したフォルダがルートとなり、その中のフォルダと音声ファイルがツリー表示されます。
          <br />
          再生位置は自動的に保存され、次回続きから再生できます。
        </p>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="rounded-2xl bg-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-900/40 transition active:scale-95"
      >
        フォルダを選択
      </button>
    </div>
  )
}

export function TreePanel() {
  const root = useAppStore((s) => s.root)
  const rootReady = useAppStore((s) => s.rootReady)
  const chooseRoot = useAppStore((s) => s.chooseRoot)
  const refreshRoot = useAppStore((s) => s.refreshRoot)
  const filePath = useAppStore((s) => s.file?.path)

  useEffect(() => {
    if (!filePath) return
    const el = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [filePath])

  useEffect(() => {
    if (root && !root.loaded) {
      useAppStore.getState().loadFolder('')
    }
  }, [root])

  if (!rootReady) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        読み込み中...
      </div>
    )
  }

  if (!root) {
    return <EmptyState onSelect={chooseRoot} />
  }

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex flex-none items-center gap-2 border-b border-slate-800 px-3 py-2">
        <IconFolder open className="h-4 w-4 flex-none text-sky-400" />
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-300">
          {root.name}
        </h2>
        <button
          type="button"
          onClick={refreshRoot}
          className="flex-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="再読み込み"
        >
          <IconRefresh className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={chooseRoot}
          className="flex-none rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          フォルダ変更
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {!root.loaded ? (
          <div className="px-3 py-2 text-xs text-slate-500">読み込み中...</div>
        ) : (
          root.children.map((child) => (
            <TreeNodeView key={child.path} node={child} depth={0} />
          ))
        )}
      </div>
      <ResumeBanner />
    </div>
  )
}
