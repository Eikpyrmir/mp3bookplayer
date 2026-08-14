import { openDB } from 'idb'
import type { Bookmark } from '../types'

const DB_NAME = 'mp3bookplayer'
const DB_VERSION = 1

let dbPromise: ReturnType<typeof openDB> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('handles')
        db.createObjectStore('bookmarks', { keyPath: 'path' })
      },
    })
  }
  return dbPromise
}

export async function saveRootHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    const db = await getDb()
    await db.put('handles', handle, 'root')
  } catch {
    // ハンドルの永続化に失敗してもアプリは動作する
  }
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDb()
    return (await db.get('handles', 'root')) ?? null
  } catch {
    return null
  }
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  try {
    const db = await getDb()
    await db.put('bookmarks', bookmark)
  } catch {
    // 失敗しても再生自体は継続する
  }
}

export async function getBookmark(path: string): Promise<Bookmark | undefined> {
  try {
    const db = await getDb()
    return await db.get('bookmarks', path)
  } catch {
    return undefined
  }
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  try {
    const db = await getDb()
    return await db.getAll('bookmarks')
  } catch {
    return []
  }
}

export async function deleteBookmark(path: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete('bookmarks', path)
  } catch {
    // ignore
  }
}

export async function clearAllBookmarks(): Promise<void> {
  try {
    const db = await getDb()
    await db.clear('bookmarks')
  } catch {
    // ignore
  }
}
