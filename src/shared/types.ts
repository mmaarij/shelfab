// Shared types between main and renderer processes

export interface Book {
  tsg_id: string;
  title: string;
  author: string;
  series_name: string | null;
  series_number: string | null;
  description: string;
  status: 'read' | 'to-read';
  epub_path: string | null;
  cover_path: string | null;
}

export interface SyncOptions {
  username: string;
  syncRead: boolean;
  syncToRead: boolean;
}

export interface SyncProgress {
  phase: 'fetching-lists' | 'fetching-details' | 're-exporting' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface BookMetadata {
  title: string;
  author: string;
  series_name?: string | null;
  series_number?: string | null;
  description: string;
  coverImagePath?: string; // path to a new cover image file
}

export interface IsbnResult {
  title: string;
  author: string;
  description: string;
}

export interface ElectronAPI {
  // Database
  getBooks: () => Promise<Book[]>;
  getBook: (tsgId: string) => Promise<Book | null>;
  updateBookMetadata: (tsgId: string, metadata: BookMetadata) => Promise<void>;
  linkEpub: (tsgId: string) => Promise<string | null>;

  // Sync
  startSync: () => Promise<void>;
  onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;

  // EPUB
  editEpubMetadata: (tsgId: string, metadata: BookMetadata) => Promise<void>;
  pickCoverImage: () => Promise<string | null>;
  reExportAll: () => Promise<void>;

  // Settings
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
  pickFolder: () => Promise<string | null>;

  // ISBN
  searchIsbn: (isbn: string) => Promise<IsbnResult | null>;

  // Cover Search
  searchCovers: (title: string, author?: string) => Promise<{ thumb: string; full: string }[]>;
  downloadCover: (url: string) => Promise<string>;

  // Onboarding & System
  openExternal: (url: string) => Promise<void>;
  clearLibrary: (includeFiles: boolean) => Promise<void>;
  isOnboarded: () => Promise<boolean>;
  completeOnboarding: (username: string, libraryFolder: string, syncRead: boolean, syncToRead: boolean) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
