import { BrowserWindow } from 'electron';
import * as cheerio from 'cheerio';
import type { SyncOptions, SyncProgress } from '../shared/types';
import { upsertBook, getBook, getAllBooks, deleteBook } from './database';

const TSG_BASE = 'https://app.thestorygraph.com';

function createHeaders(): Headers {
  const myHeaders = new Headers();
  myHeaders.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0");
  myHeaders.append("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  myHeaders.append("Accept-Language", "en-US,en;q=0.9");
  myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
  myHeaders.append("Upgrade-Insecure-Requests", "1");
  myHeaders.append("Sec-Fetch-Dest", "document");
  myHeaders.append("Sec-Fetch-Mode", "navigate");
  myHeaders.append("Sec-Fetch-Site", "none");
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Cookie", "_storygraph_session=abc; cookies_popup_seen=yes; remember_user_token=abc; up_next_onboarding=true; plus_popup_seen=yes");
  myHeaders.append("Priority", "u=0, i");
  return myHeaders;
}

const requestOptions: RequestInit = {
  method: "GET",
  headers: createHeaders(),
  redirect: "follow",
};

function sendProgress(win: BrowserWindow | null, progress: SyncProgress): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send('sync:progress', progress);
  }
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    ...requestOptions,
    headers: createHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching ${url}`);
  }
  return resp.text();
}

async function fetchBookIdsFromList(
  username: string,
  listType: 'to-read' | 'currently-reading' | 'books-read',
  win: BrowserWindow | null
): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;

  while (true) {
    const url = `${TSG_BASE}/${listType}/${username}?page=${page}`;
    sendProgress(win, {
      phase: 'fetching-lists',
      current: page,
      total: 0,
      message: `Fetching ${listType} page ${page}...`,
    });

    try {
      const html = await fetchPage(url);
      const bookIdPattern = /data-book-id="([0-9a-fA-F-]{36})"/g;
      let match: RegExpExecArray | null;
      let foundOnPage = 0;

      while ((match = bookIdPattern.exec(html)) !== null) {
        if (!ids.includes(match[1])) {
          ids.push(match[1]);
        }
        foundOnPage++;
      }

      if (foundOnPage === 0) break;
      page++;

      // Small delay to be polite
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Error fetching ${listType} page ${page}:`, err);
      break;
    }
  }

  return ids;
}

async function fetchBookDetails(
  bookId: string
): Promise<{ title: string; author: string; series_name: string | null; series_number: string | null; isbn: string | null }> {
  const url = `${TSG_BASE}/books/${bookId}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const container = $('div.book-title-author-and-series');
  const title = container.find('h3').first().text().trim();

  const authorP = container.find('p.font-body.font-medium').first();
  const authorAnchors = authorP.find('a[href^="/authors"]');
  let author = '';
  if (authorAnchors.length > 0) {
    const authorsList: string[] = [];
    authorAnchors.each((_, el) => {
      authorsList.push($(el).text().trim());
    });
    author = authorsList.join(', ');
  } else {
    author = authorP.text().trim();
  }

  // Try to extract series info
  let series_name: string | null = null;
  let series_number: string | null = null;
  
  // They have `<p class="font-semibold tracking-tight..."><a href="/series/152">Harry Potter</a> <a href="/series/152">#5</a></p>`
  const seriesP = container.find('p.font-semibold.tracking-tight').first();
  if (seriesP.length > 0) {
    const anchors = seriesP.find('a');
    if (anchors.length >= 2) {
      series_name = $(anchors[0]).text().trim();
      series_number = $(anchors[1]).text().trim();
      if (series_number.startsWith('#')) {
        series_number = series_number.substring(1);
      }
    } else if (anchors.length === 1) {
      series_name = $(anchors[0]).text().trim();
    }
  }
  
  let isbn: string | null = null;
  try {
    const editionsUrl = `${TSG_BASE}/books/${bookId}/editions`;
    const editionsHtml = await fetchPage(editionsUrl);
    const $editions = cheerio.load(editionsHtml);
    
    // Find the edition div that corresponds to this exact bookId
    const editionDiv = $editions(`div.edition-info[data-book-id="${bookId}"]`);
    if (editionDiv.length > 0) {
      // Look for the p tag that has "ISBN/UID:"
      editionDiv.find('p').each((_, el) => {
        const text = $editions(el).text();
        if (text.includes('ISBN/UID:')) {
          isbn = text.replace('ISBN/UID:', '').trim() || null;
          if (isbn === 'None') isbn = null;
        }
      });
    }
  } catch (err) {
    console.error(`Error fetching ISBN for ${bookId}:`, err);
  }

  return { title: title || 'Unknown Title', author: author || 'Unknown Author', series_name, series_number, isbn };
}

export async function syncLibrary(
  options: SyncOptions,
  win: BrowserWindow | null
): Promise<void> {
  try {
    const allIds: Map<string, 'read' | 'currently-reading' | 'to-read'> = new Map(); // id -> status

    if (options.syncToRead) {
      const toReadIds = await fetchBookIdsFromList(options.username, 'to-read', win);
      for (const id of toReadIds) {
        allIds.set(id, 'to-read');
      }
    }

    if (options.syncCurrentlyReading) {
      const currentlyReadingIds = await fetchBookIdsFromList(options.username, 'currently-reading', win);
      for (const id of currentlyReadingIds) {
        allIds.set(id, 'currently-reading'); // If in both lists somehow, this overrides to-read
      }
    }

    if (options.syncRead) {
      const readIds = await fetchBookIdsFromList(options.username, 'books-read', win);
      for (const id of readIds) {
        allIds.set(id, 'read'); // If in both lists, 'read' takes precedence
      }
    }

    const entries = Array.from(allIds.entries());
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      const [bookId, status] = entries[i];

      sendProgress(win, {
        phase: 'fetching-details',
        current: i + 1,
        total,
        message: `Fetching book ${i + 1} of ${total}...`,
      });

      try {
        const existing = getBook(bookId);
        let title = existing?.title || '';
        let author = existing?.author || '';
        let series_name = existing?.series_name || null;
        let series_number = existing?.series_number || null;
        let isbn = existing?.isbn || null;

        if (!title || !author || !isbn) {
          const details = await fetchBookDetails(bookId);
          title = title || details.title;
          author = author || details.author;
          series_name = series_name || details.series_name;
          series_number = series_number || details.series_number;
          isbn = isbn || details.isbn;
          await new Promise(r => setTimeout(r, 300));
        }

        upsertBook({
          tsg_id: bookId,
          title,
          author,
          series_name,
          series_number,
          description: existing?.description || '',
          status,
          isbn,
        });
      } catch (err) {
        console.error(`Error fetching details for book ${bookId}:`, err);
        upsertBook({
          tsg_id: bookId,
          title: '',
          author: '',
          series_name: null,
          series_number: null,
          description: '',
          status,
        });
      }
    }

    // --- Orphan Cleanup ---
    sendProgress(win, {
      phase: 'fetching-lists', // recycling phase for cleanup msg
      current: total,
      total,
      message: 'Cleaning up removed books...',
    });

    const localBooks = getAllBooks();
    let deletedCount = 0;

    for (const book of localBooks) {
      const shouldHaveBeenSynced = 
        (book.status === 'read' && options.syncRead) || 
        (book.status === 'currently-reading' && options.syncCurrentlyReading) ||
        (book.status === 'to-read' && options.syncToRead);
      
      if (shouldHaveBeenSynced && !allIds.has(book.tsg_id)) {
        deleteBook(book.tsg_id);
        deletedCount++;
      }
    }

    sendProgress(win, {
      phase: 'done',
      current: total,
      total,
      message: `Sync complete! ${total} synced, ${deletedCount} removed.`,
    });
  } catch (err: any) {
    sendProgress(win, {
      phase: 'error',
      current: 0,
      total: 0,
      message: `Sync failed: ${err.message}`,
    });
  }
}
