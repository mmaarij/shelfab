import { ipcMain, dialog, BrowserWindow, net, shell } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getAllBooks, getBook, updateBookMetadata as dbUpdateMeta,
  getSetting, setSetting, linkEpub as dbLinkEpub, updateCoverPath,
  nukeLibrary
} from './database';
import { syncLibrary } from './scraper';
import {
  editEpubMetadata, searchIsbn, copyEpubToLibrary,
  extractCoverFromEpub, reExportAllBooks, clearLibraryFolder,
  deleteLocalCovers
} from './epub';
import type { BookMetadata } from '../shared/types';

export function registerIpcHandlers(): void {
  // --- Database ---
  ipcMain.handle('db:get-books', async () => {
    const books = getAllBooks();
    let updated = false;

    for (const book of books) {
      if (book.epub_path && !fs.existsSync(book.epub_path)) {
        dbLinkEpub(book.tsg_id, null);
        updateCoverPath(book.tsg_id, null);
        updated = true;
      }
    }

    return updated ? getAllBooks() : books;
  });

  ipcMain.handle('db:nuke', async (_event, includeFiles: boolean) => {
    nukeLibrary();
    if (includeFiles) {
      await clearLibraryFolder();
    }
    await deleteLocalCovers();
  });

  ipcMain.handle('db:get-book', async (_event, tsgId: string) => {
    return getBook(tsgId);
  });

  ipcMain.handle('db:update-book-metadata', async (_event, tsgId: string, metadata: BookMetadata) => {
    dbUpdateMeta(tsgId, metadata);

    // If EPUB is linked, also update the EPUB file (which auto-syncs to library)
    const book = getBook(tsgId);
    if (book?.epub_path) {
      try {
        await editEpubMetadata(book.epub_path, metadata, tsgId);
      } catch (err) {
        console.error('Failed to update EPUB metadata:', err);
      }
    }
  });

  ipcMain.handle('db:link-epub', async (event, tsgId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select an EPUB file',
      filters: [{ name: 'EPUB files', extensions: ['epub'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) return null;

    const sourcePath = result.filePaths[0];
    const book = getBook(tsgId);
    const title = book?.title || tsgId;

    // Always copy to library folder — the copy becomes the canonical file
    const destPath = await copyEpubToLibrary(tsgId, sourcePath, title);

    // Auto-extract cover from the library copy
    const coverPath = await extractCoverFromEpub(destPath);
    if (coverPath) {
      updateCoverPath(tsgId, coverPath);
    }

    return destPath;
  });

  // --- Sync (reads config from settings) ---
  ipcMain.handle('sync:start', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const username = getSetting('tsg_username');
    const syncRead = getSetting('syncRead') !== 'false';
    const syncToRead = getSetting('syncToRead') !== 'false';

    if (!username) {
      throw new Error('No StoryGraph username configured. Please set it in Settings.');
    }

    await syncLibrary({ username, syncRead, syncToRead }, win);
  });

  // --- EPUB ---
  ipcMain.handle('epub:edit-metadata', async (_event, tsgId: string, metadata: BookMetadata) => {
    const book = getBook(tsgId);
    if (!book?.epub_path) {
      throw new Error('No EPUB linked to this book');
    }
    await editEpubMetadata(book.epub_path, metadata, tsgId);
  });

  ipcMain.handle('epub:pick-cover-image', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a cover image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('epub:re-export-all', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await reExportAllBooks((current, total, title) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('sync:progress', {
          phase: 're-exporting',
          current,
          total,
          message: `Re-exporting: ${title}`,
        });
      }
    });
    if (win && !win.isDestroyed()) {
      win.webContents.send('sync:progress', {
        phase: 'done',
        current: 0,
        total: 0,
        message: 'Re-export complete!',
      });
    }
  });

  // --- Settings ---
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    setSetting(key, value);
  });

  ipcMain.handle('settings:pick-folder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Managed Library Folder',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  // --- ISBN ---
  ipcMain.handle('isbn:search', async (_event, isbn: string) => {
    return searchIsbn(isbn);
  });

  // --- Cover Search ---
  ipcMain.handle('cover:search', async (_event, title: string, author?: string) => {
    let term = title;
    if (author) term += ` ${author}`;

    const query = new URLSearchParams({
      term: term,
      country: 'gb',
      entity: 'ebook',
      limit: '25'
    });

    try {
      const resp = await net.fetch(`https://itunes.apple.com/search?${query.toString()}`);
      if (!resp.ok) return [];
      const data = await resp.json() as any;
      if (!data.results) return [];

      return data.results
        .filter((r: any) => r.artworkUrl100)
        .map((r: any) => ({
          thumb: r.artworkUrl100,
          full: r.artworkUrl100.replace('100x100bb', '5000x5000bb')
        }));
    } catch (err) {
      console.error('Failed to search covers:', err);
      return [];
    }
  });

  ipcMain.handle('cover:download', async (_event, url: string) => {
    try {
      const resp = await net.fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const tmpDir = path.join(os.tmpdir(), 'shelfab-covers');
      await fs.promises.mkdir(tmpDir, { recursive: true });
      const ext = path.extname(url).split('?')[0] || '.jpg';
      const tmpPath = path.join(tmpDir, `cover_dl_${Date.now()}${ext}`);

      await fs.promises.writeFile(tmpPath, buffer);
      return tmpPath;
    } catch (err) {
      console.error('Failed to download cover:', err);
      throw err;
    }
  });

  // --- System ---
  ipcMain.handle('system:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  // --- Onboarding ---
  ipcMain.handle('onboarding:check', async () => {
    const username = getSetting('tsg_username');
    const folder = getSetting('libraryFolder');
    return !!(username && folder);
  });

  ipcMain.handle('onboarding:complete', async (_event, username: string, libraryFolder: string, syncRead: boolean, syncToRead: boolean) => {
    setSetting('tsg_username', username);
    setSetting('libraryFolder', libraryFolder);
    setSetting('syncRead', String(syncRead));
    setSetting('syncToRead', String(syncToRead));
  });
}
