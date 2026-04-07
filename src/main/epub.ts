import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import type { BookMetadata } from '../shared/types';
import { getSetting, linkEpub as dbLinkEpub, updateCoverPath, getAllBooks, getBook } from './database';

/**
 * Extract the cover image from an EPUB and save it to a temp location.
 * Returns the path to the extracted cover image, or null if none found.
 */
export async function extractCoverFromEpub(epubPath: string): Promise<string | null> {
  try {
    const data = await fs.promises.readFile(epubPath);
    const zip = await JSZip.loadAsync(data);

    const { opfPath, opfContent } = await findOpf(zip);
    if (!opfContent) return null;

    // Strategy 1: Look for cover-image property (EPUB3)
    let coverHref = findCoverHrefFromProperties(opfContent);

    // Strategy 2: Look for meta name="cover" (EPUB2)
    if (!coverHref) {
      coverHref = findCoverHrefFromMeta(opfContent);
    }

    if (!coverHref) {
      const match = opfContent.match(/<item[^>]*id="[^"]*cover[^"]*"[^>]*href="([^"]+)"[^>]*\/>/i);
      if (match) coverHref = match[1];
    }

    if (!coverHref) return null;

    // Resolve relative to OPF location
    const opfDir = opfPath ? path.dirname(opfPath).replace(/\\/g, '/') : '';
    const fullCoverPath = opfDir && opfDir !== '.' ? `${opfDir}/${coverHref}` : coverHref;

    const coverFile = zip.file(fullCoverPath);
    if (!coverFile) return null;

    const coverData = await coverFile.async('nodebuffer');
    const ext = path.extname(coverHref).toLowerCase() || '.jpg';

    // Save to temp
    const tmpDir = path.join(require('os').tmpdir(), 'shelfab-covers');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `cover_${Date.now()}${ext}`);
    await fs.promises.writeFile(tmpPath, coverData);

    return tmpPath;
  } catch (err) {
    console.error('Failed to extract cover from EPUB:', err);
    return null;
  }
}

function findCoverHrefFromProperties(opfContent: string): string | null {
  const match = opfContent.match(/<item[^>]*properties="[^"]*cover-image[^"]*"[^>]*href="([^"]+)"[^>]*\/?>/i);
  if (match) return match[1];
  const match2 = opfContent.match(/<item[^>]*href="([^"]+)"[^>]*properties="[^"]*cover-image[^"]*"[^>]*\/?>/i);
  return match2?.[1] || null;
}

function findCoverHrefFromMeta(opfContent: string): string | null {
  const metaMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"[^>]*\/?>/i);
  if (!metaMatch) return null;
  const coverId = metaMatch[1];
  const itemMatch = opfContent.match(new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"[^>]*\\/?>`, 'i'));
  return itemMatch?.[1] || null;
}

/**
 * Copy an EPUB to the managed library folder and update the DB.
 */
export async function copyEpubToLibrary(
  tsgId: string,
  sourcePath: string,
  title: string
): Promise<string> {
  const libraryFolder = getSetting('libraryFolder');
  if (!libraryFolder) {
    throw new Error('No managed library folder set. Please set one in Settings.');
  }

  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').trim() || tsgId;
  const destPath = path.join(libraryFolder, `${safeName}.epub`);

  await fs.promises.copyFile(sourcePath, destPath);
  dbLinkEpub(tsgId, destPath);

  return destPath;
}

/**
 * Re-export all books that have EPUBs to the managed library folder.
 */
export async function reExportAllBooks(
  progressCallback?: (current: number, total: number, title: string) => void
): Promise<void> {
  const libraryFolder = getSetting('libraryFolder');
  if (!libraryFolder) {
    throw new Error('No managed library folder set.');
  }

  const books = getAllBooks().filter(b => b.epub_path);
  const total = books.length;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (!book.epub_path) continue;

    progressCallback?.(i + 1, total, book.title);

    try {
      // Check if source file exists
      await fs.promises.access(book.epub_path);
      
      const safeName = book.title.replace(/[<>:"/\\|?*]/g, '_').trim() || book.tsg_id;
      const destPath = path.join(libraryFolder, `${safeName}.epub`);

      // Only copy if the epub_path is different from destPath
      if (path.resolve(book.epub_path) !== path.resolve(destPath)) {
        await fs.promises.copyFile(book.epub_path, destPath);
        
        const isInsideLibrary = path.resolve(book.epub_path).startsWith(path.resolve(libraryFolder));
        if (isInsideLibrary) {
          await fs.promises.unlink(book.epub_path).catch(() => {});
        }
        
        dbLinkEpub(book.tsg_id, destPath);
      }
    } catch (err) {
      console.error(`Failed to re-export ${book.title}:`, err);
    }
  }
}

async function findOpf(zip: JSZip): Promise<{ opfPath: string | null; opfContent: string | null }> {
  let opfPath: string | null = null;

  const containerXml = zip.file('META-INF/container.xml');
  if (containerXml) {
    const containerContent = await containerXml.async('text');
    const rootfileMatch = containerContent.match(/full-path="([^"]+\.opf)"/);
    if (rootfileMatch) opfPath = rootfileMatch[1];
  }

  if (!opfPath) {
    zip.forEach((relativePath) => {
      if (relativePath.endsWith('.opf') && !opfPath) opfPath = relativePath;
    });
  }

  if (!opfPath) return { opfPath: null, opfContent: null };

  const opfFile = zip.file(opfPath);
  if (!opfFile) return { opfPath: null, opfContent: null };

  const opfContent = await opfFile.async('text');
  return { opfPath, opfContent };
}

/**
 * Edit EPUB metadata by extracting the zip, modifying content.opf, and repackaging.
 */
export async function editEpubMetadata(
  epubPath: string,
  metadata: BookMetadata,
  tsgId: string
): Promise<void> {
  const data = await fs.promises.readFile(epubPath);
  const zip = await JSZip.loadAsync(data);

  const { opfPath, opfContent: rawOpf } = await findOpf(zip);
  if (!opfPath || !rawOpf) {
    throw new Error('Could not find content.opf in EPUB');
  }

  let opfContent = rawOpf;
  opfContent = updateOpfMetadata(opfContent, metadata);

  // Handle cover image replacement
  if (metadata.coverImagePath) {
    const coverData = await fs.promises.readFile(metadata.coverImagePath);
    const ext = path.extname(metadata.coverImagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';

    let coverHref = findCoverHrefFromProperties(opfContent)
      || findCoverHrefFromMeta(opfContent);

    if (!coverHref) {
      coverHref = `images/cover${ext}`;
    }

    const opfDir = path.dirname(opfPath).replace(/\\/g, '/');
    const coverFullPath = opfDir && opfDir !== '.' ? `${opfDir}/${coverHref}` : coverHref;

    zip.file(coverFullPath, coverData);

    if (!opfContent.includes('id="cover-image"')) {
      const manifestEnd = opfContent.indexOf('</manifest>');
      if (manifestEnd > -1) {
        const coverItem = `  <item id="cover-image" href="${coverHref}" media-type="${mimeType}" properties="cover-image"/>\n  `;
        opfContent = opfContent.slice(0, manifestEnd) + coverItem + opfContent.slice(manifestEnd);
      }
    }

    updateCoverPath(tsgId, metadata.coverImagePath);
  }

  zip.file(opfPath, opfContent);

  const updatedData = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await fs.promises.writeFile(epubPath, updatedData);

  // Auto-sync to library folder after metadata edit
  const libraryFolder = getSetting('libraryFolder');
  if (libraryFolder) {
    const book = getBook(tsgId);
    if (book) {
      const safeName = (metadata.title || book.title).replace(/[<>:"/\\|?*]/g, '_').trim() || tsgId;
      const destPath = path.join(libraryFolder, `${safeName}.epub`);
      if (path.resolve(epubPath) !== path.resolve(destPath)) {
        await fs.promises.copyFile(epubPath, destPath);
        
        const isInsideLibrary = path.resolve(epubPath).startsWith(path.resolve(libraryFolder));
        if (isInsideLibrary) {
          await fs.promises.unlink(epubPath).catch(() => {});
        }
        
        dbLinkEpub(tsgId, destPath);
      }
    }
  }
}

function updateOpfMetadata(opfContent: string, metadata: BookMetadata): string {
  opfContent = opfContent.replace(
    /<dc:title[^>]*>.*?<\/dc:title>/s,
    `<dc:title>${escapeXml(metadata.title)}</dc:title>`
  );

  opfContent = opfContent.replace(
    /<dc:creator[^>]*>.*?<\/dc:creator>/s,
    `<dc:creator>${escapeXml(metadata.author)}</dc:creator>`
  );

  if (opfContent.includes('<dc:description')) {
    opfContent = opfContent.replace(
      /<dc:description[^>]*>.*?<\/dc:description>/s,
      `<dc:description>${escapeXml(metadata.description)}</dc:description>`
    );
  } else {
    opfContent = opfContent.replace(
      /(<dc:title[^>]*>.*?<\/dc:title>)/s,
      `$1\n    <dc:description>${escapeXml(metadata.description)}</dc:description>`
    );
  }

  return opfContent;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Search Open Library API by ISBN to get metadata.
 */
export async function searchIsbn(isbn: string): Promise<{
  title: string;
  author: string;
  description: string;
} | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // Try the books API first
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`;
    const resp = await fetch(url);
    const data = await resp.json() as Record<string, any>;

    const key = `ISBN:${cleanIsbn}`;
    if (!data[key]) {
      // Fallback: try the search API
      const searchUrl = `https://openlibrary.org/search.json?isbn=${cleanIsbn}&limit=1`;
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json() as any;
      
      if (searchData.docs?.length > 0) {
        const doc = searchData.docs[0];
        // Try to get description from the work
        let description = '';
        if (doc.key) {
          try {
            const workResp = await fetch(`https://openlibrary.org${doc.key}.json`);
            const workData = await workResp.json() as any;
            description = typeof workData.description === 'string' 
              ? workData.description 
              : workData.description?.value || '';
          } catch {}
        }
        return {
          title: doc.title || '',
          author: doc.author_name?.join(', ') || '',
          description,
        };
      }
      return null;
    }

    const book = data[key];

    // Get description - try multiple sources
    let description = '';
    if (book.notes) {
      description = typeof book.notes === 'string' ? book.notes : book.notes.value || '';
    } else if (book.excerpts?.[0]?.text) {
      description = book.excerpts[0].text;
    }

    // If no description from books API, try the works API
    if (!description && book.key) {
      try {
        const workResp = await fetch(`https://openlibrary.org${book.key}.json`);
        const workData = await workResp.json() as any;
        description = typeof workData.description === 'string'
          ? workData.description
          : workData.description?.value || '';
      } catch {}
    }

    return {
      title: book.title || '',
      author: book.authors?.map((a: any) => a.name).join(', ') || '',
      description,
    };
  } catch (err) {
    console.error('ISBN search error:', err);
    return null;
  }
}

/**
 * Delete all EPUB files in the managed library folder.
 */
export async function clearLibraryFolder(): Promise<void> {
  const libraryFolder = getSetting('libraryFolder');
  if (!libraryFolder) return;

  try {
    const files = await fs.promises.readdir(libraryFolder);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.epub')) {
        await fs.promises.unlink(path.join(libraryFolder, file)).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Failed to clear library folder:', err);
  }
}

/**
 * Delete the temporary cover image cache.
 */
export async function deleteLocalCovers(): Promise<void> {
  const tmpDir = path.join(require('os').tmpdir(), 'shelfab-covers');
  try {
    const files = await fs.promises.readdir(tmpDir).catch(() => [] as string[]);
    for (const file of files) {
      await fs.promises.unlink(path.join(tmpDir, file)).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to delete local covers:', err);
  }
}
