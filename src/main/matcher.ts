import fs from 'fs';
import path from 'path';
import * as fuzzball from 'fuzzball';
import { getAllBooks, updateCoverPath } from './database';
import { extractIsbnFromEpub, extractEpubMetadata, copyEpubToLibrary, extractCoverFromEpub } from './epub';
import type { AutoLinkResult, Book } from '../shared/types';
import { getSetting } from './database';

export async function processAutoLink(sourceDirectory: string): Promise<AutoLinkResult> {
  const result: AutoLinkResult = {
    successful: [],
    proposed: [],
    failed: []
  };

  const files = await fs.promises.readdir(sourceDirectory);
  const epubFiles = files.filter(f => f.toLowerCase().endsWith('.epub'));
  
  const allBooks = getAllBooks();
  const unlinkedBooks = allBooks.filter(b => !b.epub_path);

  for (const filename of epubFiles) {
    const epubPath = path.join(sourceDirectory, filename);
    let matched = false;

    try {
      // Step 1: The ISBN (The "Gold Standard")
      const isbn = await extractIsbnFromEpub(epubPath);
      let metadata: any = null;

      if (isbn) {
        // Clean ISBN (remove hyphens)
        const cleanIsbn = isbn.replace(/-/g, '');
        const bookByIsbn = unlinkedBooks.find(b => b.isbn && b.isbn.replace(/-/g, '') === cleanIsbn);

        if (bookByIsbn) {
          const epubCoverPath = await extractCoverFromEpub(epubPath) || undefined;
          result.successful.push({
            book: bookByIsbn,
            epubPath,
            matchType: 'isbn',
            epubCoverPath
          });
          matched = true;
          await finalizeAcceptAutoLink(bookByIsbn.tsg_id, epubPath, bookByIsbn);
          continue; // Move to next file
        }
      }

      // Step 2: Internal Metadata (Title + Author)
      metadata = await extractEpubMetadata(epubPath);
      let epubTitle = metadata?.title;
      let epubAuthor = metadata?.author;

      if (epubTitle && epubTitle.toLowerCase() !== 'ebook') {
        const metadataMatches = findBestMatches(epubTitle, epubAuthor, unlinkedBooks, 'metadata');
        
        if (metadataMatches.length > 0) {
          const bestMatch = metadataMatches[0];
          const epubCoverPath = await extractCoverFromEpub(epubPath) || undefined;
          result.proposed.push({
            book: bestMatch.book,
            epubPath,
            epubTitle,
            epubAuthor,
            matchType: 'metadata',
            confidence: bestMatch.score,
            epubCoverPath
          });
          matched = true;
          continue;
        }
      }

      // Step 3: Filename (The "Last Resort")
      const cleanFilename = filename
        .replace(/\.epub$/i, '')
        .replace(/_/g, ' ')
        .replace(/v\d+\.\d+/gi, '') // Remove versioning like v1.0
        .trim();

      const filenameMatches = findBestMatches(cleanFilename, '', unlinkedBooks, 'filename');
      if (filenameMatches.length > 0) {
        const bestMatch = filenameMatches[0];
        const epubCoverPath = await extractCoverFromEpub(epubPath) || undefined;
        result.proposed.push({
          book: bestMatch.book,
          epubPath,
          epubTitle: cleanFilename, // passing it as title for review UX
          epubAuthor: '',
          matchType: 'filename',
          confidence: bestMatch.score,
          epubCoverPath
        });
        matched = true;
        continue;
      }

      // If we got here and didn't match
      if (!matched) {
        result.failed.push({
          epubPath,
          reason: 'No match found via ISBN, Metadata, or Filename.'
        });
      }

    } catch (err) {
      console.error(`Failed reading ${filename}:`, err);
      result.failed.push({
        epubPath,
        reason: 'Error reading EPUB file.'
      });
    }
  }

  // Deduplicate proposed matches so the same book isn't proposed for multiple files
  const seenBooks = new Set<string>();
  result.proposed = result.proposed
    .sort((a, b) => b.confidence - a.confidence)
    .filter(p => {
      if (seenBooks.has(p.book.tsg_id)) return false;
      seenBooks.add(p.book.tsg_id);
      return true;
    });
  
  return result;
}

function findBestMatches(epubTitle: string, epubAuthor: string | undefined, unlinkedBooks: Book[], type: 'metadata' | 'filename') {
  const matches = unlinkedBooks.map(book => {
    let score = 0;
    
    if (type === 'metadata') {
      const titleScore = fuzzball.token_set_ratio(epubTitle, book.title);
      // Give a slight boost if author is also close
      let authorScore = 0;
      if (epubAuthor && epubAuthor.trim() && book.author && book.author.trim()) {
        authorScore = fuzzball.token_set_ratio(epubAuthor, book.author);
      }
      
      // Weighted score
      score = epubAuthor ? (titleScore * 0.7) + (authorScore * 0.3) : titleScore;
    } else {
      // Filename compares against title, or title + author
      const targetStr = `${book.title} ${book.author || ''}`.trim();
      score = fuzzball.token_set_ratio(epubTitle, targetStr);
    }
    
    return { book, score };
  });

  // Filter out low confidence - Increased threshold to >75 to avoid generic poor matches
  return matches
    .filter(m => m.score > 75)
    .sort((a, b) => b.score - a.score);
}

export async function finalizeAcceptAutoLink(tsgId: string, epubPath: string, bookInfo?: Book) {
  const title = bookInfo?.title || 'book';
  const author = bookInfo?.author;
  
  // Copy to library folder
  const destPath = await copyEpubToLibrary(tsgId, epubPath, title, author);

  // Auto-extract cover
  const coverPath = await extractCoverFromEpub(destPath);
  if (coverPath) {
    updateCoverPath(tsgId, coverPath);
  }
}