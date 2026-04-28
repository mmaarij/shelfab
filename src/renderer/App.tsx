import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BookGrid } from './components/BookGrid';
import { BookDetail } from './components/BookDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { Onboarding } from './components/Onboarding';
import logoUrl from './assets/shelfab-logo.svg';
import type { Book, SyncProgress } from '../shared/types';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [reExporting, setReExporting] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  // Check onboarding status
  useEffect(() => {
    window.electronAPI.isOnboarded().then(setOnboarded);
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      const data = await window.electronAPI.getBooks();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (onboarded) loadBooks();
  }, [onboarded, loadBooks]);

  // Listen for sync progress
  useEffect(() => {
    const unsubscribe = window.electronAPI.onSyncProgress((prog) => {
      setProgress(prog);
      if (prog.phase === 'done' || prog.phase === 'error') {
        setSyncing(false);
        setReExporting(false);
        if (prog.phase === 'done') loadBooks();
        // Auto-clear the done/error message after a few seconds
        setTimeout(() => setProgress(null), 5000);
      }
    });
    return unsubscribe;
  }, [loadBooks]);

  const handleSync = async () => {
    setSyncing(true);
    setProgress(null);
    try {
      await window.electronAPI.startSync();
    } catch (err: any) {
      setSyncing(false);
      setProgress({ phase: 'error', current: 0, total: 0, message: `Sync failed: ${err.message}` });
    }
  };

  const handleReExport = async () => {
    setReExporting(true);
    setProgress(null);
    try {
      await window.electronAPI.reExportAll();
    } catch (err: any) {
      setReExporting(false);
      setProgress({ phase: 'error', current: 0, total: 0, message: `Re-export failed: ${err.message}` });
    }
  };

  const handleBookSave = useCallback(async () => {
    await loadBooks();
    if (selectedBook) {
      const updated = await window.electronAPI.getBook(selectedBook.tsg_id);
      if (updated) setSelectedBook(updated);
    }
  }, [loadBooks, selectedBook]);

  const handleOnboardingComplete = () => {
    setOnboarded(true);
    setLoading(true);
    loadBooks();
  };

  // Still checking onboarding status
  if (onboarded === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center font-normal" style={{ fontFamily: "'Belanosima', sans-serif", color: '#f14900' }}>
        <img src={logoUrl} alt="Shelfab Logo" className="w-10 h-10 animate-pulse mb-3" />
        <h1 className="text-2xl">Shelfab</h1>
      </div>
    );
  }

  // Show onboarding
  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onSyncClick={handleSync}
        onReExportClick={handleReExport}
        syncing={syncing}
        reExporting={reExporting}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-in font-normal" style={{ fontFamily: "'Belanosima', sans-serif", color: '#f14900' }}>
            <img src={logoUrl} alt="Shelfab Logo" className="w-10 h-10 mb-1" />
            <p className="text-xs text-muted-foreground/50 tracking-normal" style={{ fontFamily: "'Outfit', sans-serif" }}>Loading library…</p>
          </div>
        </div>
      ) : (
        <BookGrid books={books} onBookClick={setSelectedBook} progress={progress} />
      )}

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSave={handleBookSave}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => {
        setShowSettings(false);
        loadBooks(); // Refresh books when settings closes to show auto-links
      }} />}
    </div>
  );
}
