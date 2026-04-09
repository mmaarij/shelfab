import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Book, BookMetadata } from '../shared/types';

let db: Database.Database;

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'shelfab.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      tsg_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      series_name TEXT,
      series_number TEXT,
      description TEXT NOT NULL DEFAULT '',
      isbn TEXT,
      status TEXT NOT NULL DEFAULT 'to-read',
      epub_path TEXT,
      cover_path TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  try {
    db.prepare('ALTER TABLE books ADD COLUMN isbn TEXT').run();
  } catch (e) {
    // Column might already exist, ignore mapping error
  }
}

export function getDatabase(): Database.Database {
  return db;
}

export function getAllBooks(): Book[] {
  const stmt = db.prepare('SELECT * FROM books ORDER BY title ASC');
  return stmt.all() as Book[];
}

export function getBook(tsgId: string): Book | null {
  const stmt = db.prepare('SELECT * FROM books WHERE tsg_id = ?');
  return (stmt.get(tsgId) as Book) || null;
}

export function upsertBook(book: Partial<Book> & { tsg_id: string; status: string }): void {
  const existing = getBook(book.tsg_id);

  if (existing) {
    // Update status from TSG (1-way sync), and fill in title/author if they were empty
    db.prepare(`
      UPDATE books SET
        title = COALESCE(NULLIF(?, ''), title),
        author = COALESCE(NULLIF(?, ''), author),
        series_name = COALESCE(?, series_name),
        series_number = COALESCE(?, series_number),
        description = COALESCE(NULLIF(?, ''), description),
        isbn = COALESCE(?, isbn),
        status = ?
      WHERE tsg_id = ?
    `).run(
      book.title || '',
      book.author || '',
      book.series_name || null,
      book.series_number || null,
      book.description || '',
      book.isbn || null,
      book.status,
      book.tsg_id
    );
  } else {
    db.prepare(`
      INSERT INTO books (tsg_id, title, author, series_name, series_number, description, isbn, status, epub_path, cover_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    `).run(
      book.tsg_id,
      book.title || '',
      book.author || '',
      book.series_name || null,
      book.series_number || null,
      book.description || '',
      book.isbn || null,
      book.status
    );
  }
}

export function updateBookMetadata(tsgId: string, metadata: BookMetadata): void {
  db.prepare(`
    UPDATE books SET title = ?, author = ?, series_name = ?, series_number = ?, description = ?, isbn = ? WHERE tsg_id = ?
  `).run(metadata.title, metadata.author, metadata.series_name || null, metadata.series_number || null, metadata.description, metadata.isbn || null, tsgId);
}

export function linkEpub(tsgId: string, epubPath: string | null): void {
  db.prepare('UPDATE books SET epub_path = ? WHERE tsg_id = ?').run(epubPath, tsgId);
}

export function updateCoverPath(tsgId: string, coverPath: string | null): void {
  db.prepare('UPDATE books SET cover_path = ? WHERE tsg_id = ?').run(coverPath, tsgId);
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function deleteBook(tsgId: string): void {
  db.prepare('DELETE FROM books WHERE tsg_id = ?').run(tsgId);
}

export function nukeLibrary(): void {
  db.prepare('DELETE FROM books').run();
}
