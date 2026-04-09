import React from 'react';
import { FileText } from 'lucide-react';
import { Badge } from './ui/badge';
import type { Book } from '../../shared/types';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  const hasEpub = !!book.epub_path;
  const hasCover = !!book.cover_path;

  return (
    <button
      onClick={onClick}
      className="book-card group flex flex-col text-left w-full h-full rounded-lg overflow-hidden bg-card/60 border border-border/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {/* Cover */}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-card to-secondary/30 overflow-hidden shrink-0">
        {hasCover ? (
          <img
            src={`asset:///${book.cover_path?.replace(/\\/g, '/')}`}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-[11px] font-semibold text-foreground/40 leading-snug line-clamp-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                {book.title || 'No Title'}
              </p>
              <p className="text-[9px] text-foreground/20 mt-1.5">
                {book.author || ''}
              </p>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* EPUB badge */}
        {hasEpub && (
          <div className="absolute top-1.5 right-1.5">
            <div className="bg-emerald-500/90 rounded-full p-1 shadow-sm">
              <FileText className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
        )}

        {/* Status */}
        <div className="absolute bottom-1.5 left-1.5">
          <Badge 
            variant={book.status === 'read' ? 'success' : book.status === 'currently-reading' ? 'default' : 'warning'} 
            className="text-[9px] px-1.5 py-0"
          >
            {book.status === 'read' ? 'Read' : book.status === 'currently-reading' ? 'Reading' : 'To Read'}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-0.5 w-full min-w-0">
        <h3 className="text-xs font-medium truncate group-hover:text-primary transition-colors" title={book.title}>
          {book.title || 'Untitled'}
        </h3>
        <p className="text-[10px] text-muted-foreground truncate" title={book.author}>
          {book.author || 'Unknown'}
        </p>
        {book.series_name && (
          <p className="text-[9px] text-primary/70 truncate flex items-center gap-1" title={`${book.series_name} ${book.series_number ? `(#${book.series_number})` : ''}`}>
            <span className="opacity-80 shrink-0">Series:</span>
            <span className="truncate">{book.series_name} {book.series_number ? `(#${book.series_number})` : ''}</span>
          </p>
        )}
      </div>
    </button>
  );
}
