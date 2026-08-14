import type { FileNode, FolderNode, TreeNode } from '../types'
import { sortNodes } from '../utils/sort'

export const MEDIA_EXTENSIONS = ['mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav']

export function isMediaFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext !== undefined && MEDIA_EXTENSIONS.includes(ext)
}

function joinPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`
}

export async function readFolderChildren(
  handle: FileSystemDirectoryHandle,
  parentPath: string,
): Promise<TreeNode[]> {
  const folders: FolderNode[] = []
  const files: FileNode[] = []
  for await (const entry of handle.values()) {
    if (entry.name.startsWith('.')) continue
    const path = joinPath(parentPath, entry.name)
    if (entry.kind === 'directory') {
      folders.push({
        kind: 'folder',
        name: entry.name,
        path,
        handle: entry,
        loaded: false,
        children: [],
      })
    } else if (entry.kind === 'file' && isMediaFile(entry.name)) {
      files.push({ kind: 'file', name: entry.name, path, handle: entry })
    }
  }
  return [...sortNodes(folders), ...sortNodes(files)]
}

export async function pickRootDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (options?: {
        mode?: 'read' | 'readwrite'
      }) => Promise<FileSystemDirectoryHandle>
    }
  ).showDirectoryPicker
  if (!picker) {
    throw new Error('このブラウザはフォルダ選択に対応していません')
  }
  return await picker({ mode: 'read' })
}

export async function ensureReadPermission(
  handle: FileSystemDirectoryHandle,
  request: boolean,
): Promise<PermissionState> {
  const query = (handle as FileSystemDirectoryHandle & {
    queryPermission?: (opts?: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  }).queryPermission
  if (query) {
    const state = await query.call(handle, { mode: 'read' })
    if (state === 'granted') return state
  }
  if (request) {
    const requestFn = (handle as FileSystemDirectoryHandle & {
      requestPermission?: (opts?: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    }).requestPermission
    if (requestFn) return await requestFn.call(handle, { mode: 'read' })
  }
  return 'denied'
}
