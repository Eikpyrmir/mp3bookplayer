export interface TreeNodeBase {
  name: string
  path: string
}

export interface FolderNode extends TreeNodeBase {
  kind: 'folder'
  handle: FileSystemDirectoryHandle
  loaded: boolean
  children: TreeNode[]
}

export interface FileNode extends TreeNodeBase {
  kind: 'file'
  handle: FileSystemFileHandle
}

export type TreeNode = FolderNode | FileNode

export type PlayerStatus = 'idle' | 'playing' | 'paused'

export interface Bookmark {
  path: string
  title: string
  position: number
  duration: number
  speed: number
  updatedAt: number
}
