import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Image, Search, Loader2, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import type { Book, BookMetadata } from '../../shared/types';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onSave: () => void;
}

export function BookDetail({ book, onClose, onSave }: BookDetailProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [seriesName, setSeriesName] = useState(book.series_name || '');
  const [seriesNumber, setSeriesNumber] = useState(book.series_number || '');
  const [description, setDescription] = useState(book.description);
  const [coverPath, setCoverPath] = useState(book.cover_path || '');
  const [isbn, setIsbn] = useState(book.isbn || '');
  const [hasEpub, setHasEpub] = useState(!!book.epub_path);
  const [saving, setSaving] = useState(false);
  const [searchingIsbn, setSearchingIsbn] = useState(false);
  const [searchingCovers, setSearchingCovers] = useState(false);
  const [coverResults, setCoverResults] = useState<{thumb: string, full: string}[] | null>(null);
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setTitle(book.title);
    setAuthor(book.author);
    setSeriesName(book.series_name || '');
    setSeriesNumber(book.series_number || '');
    setDescription(book.description);
    setCoverPath(book.cover_path || '');
    setIsbn(book.isbn || '');
    setHasEpub(!!book.epub_path);
    setCoverResults(null);
    setMsg(null);
  }, [book.tsg_id]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const metadata: BookMetadata = {
        title,
        author,
        series_name: seriesName,
        series_number: seriesNumber,
        description,
        isbn,
        coverImagePath: coverPath && coverPath !== book.cover_path ? coverPath : undefined,
      };
      await window.electronAPI.updateBookMetadata(book.tsg_id, metadata);
      setMsg({ ok: true, text: 'Saved & synced to library' });
      onSave();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleLinkEpub = async () => {
    setLinking(true);
    setMsg(null);
    try {
      const epubPath = await window.electronAPI.linkEpub(book.tsg_id);
      if (epubPath) {
        setHasEpub(true);
        setMsg({ ok: true, text: 'EPUB linked — cover and ISBN extracted if available' });
        onSave();
        // Refresh book data to get the extracted cover and ISBN
        const updated = await window.electronAPI.getBook(book.tsg_id);
        if (updated?.cover_path) setCoverPath(updated.cover_path);
        if (updated?.isbn) setIsbn(updated.isbn);
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Failed to link' });
    } finally {
      setLinking(false);
    }
  };

  const handlePickCover = async () => {
    const path = await window.electronAPI.pickCoverImage();
    if (path) setCoverPath(path);
  };

  const handleSearchCovers = async () => {
    if (!title.trim()) return;
    setSearchingCovers(true);
    setMsg(null);
    try {
      const resp = await window.electronAPI.searchCovers(title, author);
      setCoverResults(resp);
      if (resp.length === 0) setMsg({ ok: false, text: 'No covers found online' });
    } catch (err: any) {
      setMsg({ ok: false, text: 'Cover lookup failed' });
      setCoverResults(null);
    } finally {
      setSearchingCovers(false);
    }
  };

  const handleSelectCover = async (fullUrl: string) => {
    setSearchingCovers(true);
    try {
      const downloadedPath = await window.electronAPI.downloadCover(fullUrl);
      setCoverPath(downloadedPath);
      setCoverResults(null);
      setMsg({ ok: true, text: 'Cover downloaded' });
    } catch (err: any) {
      setMsg({ ok: false, text: 'Failed to download cover' });
    } finally {
      setSearchingCovers(false);
    }
  };

  const handleIsbnSearch = async () => {
    if (!isbn.trim()) return;
    setSearchingIsbn(true);
    setMsg(null);
    try {
      const result = await window.electronAPI.searchIsbn(isbn.trim());
      if (result) {
        if (result.title) setTitle(result.title);
        if (result.author) setAuthor(result.author);
        if (result.description) setDescription(result.description);
        setMsg({ ok: true, text: 'Fields populated from ISBN' });
      } else {
        setMsg({ ok: false, text: 'No results for this ISBN' });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Lookup failed' });
    } finally {
      setSearchingIsbn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border/30 animate-slide-in overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/20 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Edit Book</h2>
            <div className="flex items-center gap-1.5 h-full">
                <Badge 
                  variant={book.status === 'read' ? 'success' : book.status === 'currently-reading' ? 'default' : 'warning'} 
                  className="text-[9px] px-1.5 py-0"
                >
                  {book.status === 'read' ? 'Read' : book.status === 'currently-reading' ? 'Reading' : 'To Read'}
              </Badge>
              {hasEpub && (
                <Badge variant="success" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0">
                  <FileText className="mr-0.5 h-2.5 w-2.5" />EPUB
                </Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-card transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5 stagger-children">
          {/* Link / Re-Link Context */}
          {!hasEpub ? (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-3.5 animate-fade-in shadow-sm">
              <p className="text-[11px] text-primary/80 leading-relaxed text-center px-2">
                This book is currently unlinked. Link a local EPUB file to unlock metadata editing and fetch covers!
              </p>
              <Button onClick={handleLinkEpub} disabled={linking} className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs">
                {linking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-2 h-3.5 w-3.5" />}
                Link EPUB File
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLinkEpub} disabled={linking} className="w-full text-xs h-8 justify-center border-dashed border-border/60 hover:border-border transition-colors text-muted-foreground hover:text-foreground">
              {linking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-2 h-3.5 w-3.5" />}
              Re-link EPUB File
            </Button>
          )}

          {/* Cover + Actions */}
          <div className={`flex gap-5 ${!hasEpub ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="w-24 h-36 rounded-md bg-card border border-border/20 overflow-hidden shrink-0 shadow-sm relative group">
              {coverPath ? (
                <img src={`asset:///${coverPath.replace(/\\/g, '/')}`} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-0.5">Cover Image</p>
              <Button variant="outline" size="sm" onClick={handlePickCover} disabled={!hasEpub} className="w-full text-xs h-9 justify-start bg-card/40 border-border/40 hover:bg-card">
                <Image className="mr-2.5 h-3.5 w-3.5 text-muted-foreground" />
                Upload Local File
              </Button>
              <Button variant="outline" size="sm" onClick={handleSearchCovers} disabled={!hasEpub || searchingCovers} className="w-full text-xs h-9 justify-start bg-card/40 border-border/40 hover:bg-card">
                {searchingCovers ? <Loader2 className="mr-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" /> : <Search className="mr-2.5 h-3.5 w-3.5 text-muted-foreground" />}
                Search Web
              </Button>
            </div>
          </div>

          {/* Cover search results */}
          {coverResults && coverResults.length > 0 && (
            <div className="space-y-1.5 animate-fade-in bg-card/40 rounded-lg p-2 border border-border/30">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Select Cover</label>
                <button onClick={() => setCoverResults(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 px-1 snap-x no-scrollbar">
                {coverResults.map((cov, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelectCover(cov.full)}
                    className="w-14 h-20 shrink-0 rounded bg-background border border-border/40 overflow-hidden hover:border-primary/50 transition-all snap-start"
                  >
                    <img src={cov.thumb} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ISBN */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              ISBN
            </label>
            <div className="flex gap-1.5">
              <Input
                id="isbn-search"
                placeholder="ISBN..."
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                disabled={!hasEpub || searchingIsbn}
                className="h-8 text-xs bg-card/50 border-border/30"
              />
              <Button variant="secondary" size="sm" onClick={handleIsbnSearch} disabled={!hasEpub || searchingIsbn || !isbn.trim()} className="h-8 px-3">
                {searchingIsbn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Title</label>
            <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!hasEpub} className="h-9 text-sm bg-card/50 border-border/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Author</label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} disabled={!hasEpub} className="h-9 text-sm bg-card/50 border-border/30" />
          </div>
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Series Name</label>
              <Input id="book-series" value={seriesName} onChange={(e) => setSeriesName(e.target.value)} disabled={!hasEpub} className="h-9 text-sm bg-card/50 border-border/30" />
            </div>
            <div className="space-y-1.5 w-24">
              <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Number</label>
              <Input id="book-series-number" value={seriesNumber} onChange={(e) => setSeriesNumber(e.target.value)} disabled={!hasEpub} className="h-9 text-sm bg-card/50 border-border/30 text-center" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Description</label>
            <Textarea id="book-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!hasEpub} rows={4} className="text-xs bg-card/50 border-border/30" />
          </div>

          {/* Message */}
          {msg && (
            <p className={`text-[11px] px-3 py-2 rounded-md ${
              msg.ok ? 'bg-emerald-500/[0.06] text-emerald-400/80' : 'bg-red-500/[0.06] text-red-400/80'
            }`}>
              {msg.text}
            </p>
          )}

          {/* Save */}
          <Button id="save-metadata" onClick={handleSave} disabled={!hasEpub || saving} className="w-full h-9 text-xs">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save & Sync
          </Button>
        </div>
      </div>
    </div>
  );
}
