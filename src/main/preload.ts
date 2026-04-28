import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';

const api: ElectronAPI = {
  // Database
  getBooks: () => ipcRenderer.invoke('db:get-books'),
  getBook: (tsgId) => ipcRenderer.invoke('db:get-book', tsgId),
  updateBookMetadata: (tsgId, metadata) => ipcRenderer.invoke('db:update-book-metadata', tsgId, metadata),
  linkEpub: (tsgId) => ipcRenderer.invoke('db:link-epub', tsgId),

  // Sync (no args — reads from settings)
  startSync: () => ipcRenderer.invoke('sync:start'),
  onSyncProgress: (callback) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('sync:progress', handler);
    return () => ipcRenderer.removeListener('sync:progress', handler);
  },

  // EPUB
  editEpubMetadata: (tsgId, metadata) => ipcRenderer.invoke('epub:edit-metadata', tsgId, metadata),
  pickCoverImage: () => ipcRenderer.invoke('epub:pick-cover-image'),
  reExportAll: () => ipcRenderer.invoke('epub:re-export-all'),  autoLinkBooks: (sourceDirectory: string) => ipcRenderer.invoke('epub:auto-link', sourceDirectory),
  acceptAutoLink: (tsgId: string, epubPath: string) => ipcRenderer.invoke('epub:accept-auto-link', tsgId, epubPath),
  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  pickFolder: () => ipcRenderer.invoke('settings:pick-folder'),

  // ISBN
  searchIsbn: (isbn) => ipcRenderer.invoke('isbn:search', isbn),

  // Cover Search
  searchCovers: (title, author) => ipcRenderer.invoke('cover:search', title, author),
  downloadCover: (url) => ipcRenderer.invoke('cover:download', url),

  // Onboarding & System
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  clearLibrary: (includeFiles) => ipcRenderer.invoke('db:nuke', includeFiles),
  isOnboarded: () => ipcRenderer.invoke('onboarding:check'),
  completeOnboarding: (username, libraryFolder, syncRead, syncCurrentlyReading, syncToRead) =>
    ipcRenderer.invoke('onboarding:complete', username, libraryFolder, syncRead, syncCurrentlyReading, syncToRead),
};

contextBridge.exposeInMainWorld('electronAPI', api);
