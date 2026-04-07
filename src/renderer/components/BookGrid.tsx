import React, { useState } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { Input } from './ui/input';
import { BookCard } from './BookCard';
import { SeriesCard } from './SeriesCard';
import type { Book } from '../../shared/types';
import type { SyncProgress } from '../../shared/types';

interface BookGridProps {
  books: Book[];
  onBookClick: (book: Book) => void;
  progress: SyncProgress | null;
}

type FilterType = 'all' | 'read' | 'to-read' | 'has-epub' | 'no-epub' | 'series';

export function BookGrid({ books, onBookClick, progress }: BookGridProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      !search ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase()) ||
      (book.series_name && book.series_name.toLowerCase().includes(search.toLowerCase()));

    let matchesFilter = true;
    switch (filter) {
      case 'read': matchesFilter = book.status === 'read'; break;
      case 'to-read': matchesFilter = book.status === 'to-read'; break;
      case 'has-epub': matchesFilter = !!book.epub_path; break;
      case 'no-epub': matchesFilter = !book.epub_path; break;
    }

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // If they are in the same series, sort by series number
    if (a.series_name && b.series_name && a.series_name === b.series_name) {
      const numA = parseFloat(a.series_number || '0');
      const numB = parseFloat(b.series_number || '0');
      return numA - numB;
    }
    // Otherwise, if we are searching, we might want to group by series first or just fallback to title sorting
    return a.title.localeCompare(b.title);
  });

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: books.length },
    { key: 'read', label: 'Read', count: books.filter(b => b.status === 'read').length },
    { key: 'to-read', label: 'To Read', count: books.filter(b => b.status === 'to-read').length },
    { key: 'has-epub', label: 'EPUB', count: books.filter(b => b.epub_path).length },
    { key: 'no-epub', label: 'No EPUB', count: books.filter(b => !b.epub_path).length },
    { key: 'series', label: 'Series', count: new Set(books.filter(b => b.series_name).map(b => b.series_name)).size },
  ];

  let seriesMap = new Map<string, Book[]>();
  let sortedSeries: { name: string; books: Book[] }[] = [];

  if (filter === 'series') {
    filteredBooks.forEach(b => {
      if (b.series_name) {
        const list = seriesMap.get(b.series_name) || [];
        list.push(b);
        seriesMap.set(b.series_name, list);
      }
    });
    sortedSeries = Array.from(seriesMap.entries()).map(([name, bks]) => ({ name, books: bks }));
    sortedSeries.sort((a, b) => a.name.localeCompare(b.name));
  }

  const showProgress = progress && progress.phase !== 'done' && progress.phase !== 'error';
  const progressPercent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      {showProgress && (
        <div className="px-5 py-2 border-b border-border/20 bg-card/30">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{progress!.message}</span>
            {progress!.total > 0 && <span>{progressPercent}%</span>}
          </div>
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Progress done message */}
      {progress?.phase === 'done' && (
        <div className="px-5 py-2 border-b border-border/20 bg-emerald-500/[0.04]">
          <p className="text-[11px] text-emerald-400/80">{progress.message}</p>
        </div>
      )}

      {/* Progress error */}
      {progress?.phase === 'error' && (
        <div className="px-5 py-2 border-b border-border/20 bg-red-500/[0.04]">
          <p className="text-[11px] text-red-400/80">{progress.message}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-5 py-2.5 border-b border-border/20 flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            id="search-books"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs bg-card/50 border-border/30"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-card/60 rounded-md p-0.5 border border-border/20">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                filter === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-card/60 rounded-md p-0.5 border border-border/20">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {(filter === 'series' ? sortedSeries.length === 0 : filteredBooks.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
            <span className="text-4xl mb-4">📖</span>
            <h3 className="text-sm font-medium mb-1">
              {(filter === 'series' ? sortedSeries.length === 0 : books.length === 0) ? 'Your library is empty' : 'No matches'}
            </h3>
            <p className="text-xs text-muted-foreground/60 max-w-[250px]">
              {(filter === 'series' ? sortedSeries.length === 0 : books.length === 0)
                ? 'Hit the Sync button to pull your books from StoryGraph.'
                : 'Try a different search term or filter.'}
            </p>
          </div>
        ) : filter === 'series' ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
              {sortedSeries.map(({ name, books }) => (
                <SeriesCard
                  key={name}
                  seriesName={name}
                  books={books}
                  onClick={() => {
                    setFilter('all');
                    setSearch(name);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedSeries.map(({ name, books: sbooks }) => {
                const coverBook = sbooks.find(b => b.cover_path);
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setFilter('all');
                      setSearch(name);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-card/60 transition-colors text-left group"
                  >
                    <div className="w-8 h-11 rounded bg-card/80 border border-border/20 overflow-hidden shrink-0">
                      {coverBook?.cover_path ? (
                        <img src={`asset:///${coverBook.cover_path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[7px] font-bold text-muted-foreground/40 text-center uppercase">
                            {name.slice(0, 3)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                        {name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground/50 truncate">{sbooks.length} book{sbooks.length !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
            {filteredBooks.map((book) => (
              <BookCard key={book.tsg_id} book={book} onClick={() => onBookClick(book)} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredBooks.map((book) => (
              <button
                key={book.tsg_id}
                onClick={() => onBookClick(book)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-card/60 transition-colors text-left group"
              >
                <div className="w-8 h-11 rounded bg-card/80 border border-border/20 overflow-hidden shrink-0">
                  {book.cover_path ? (
                    <img src={`asset:///${book.cover_path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[7px] font-bold text-muted-foreground/40">
                        {book.title.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                    {book.title || 'Untitled'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/50 truncate">{book.author}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {book.epub_path && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400/80 px-1.5 py-0.5 rounded font-medium">
                      EPUB
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    book.status === 'read' ? 'bg-emerald-500/10 text-emerald-400/80' : 'bg-amber-500/10 text-amber-400/80'
                  }`}>
                    {book.status === 'read' ? 'Read' : 'To Read'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
