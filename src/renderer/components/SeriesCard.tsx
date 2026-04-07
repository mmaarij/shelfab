import React, { useState, useEffect } from "react";
import type { Book } from "../../shared/types";

interface SeriesCardProps {
  seriesName: string;
  books: Book[];
  onClick: () => void;
}

export function SeriesCard({ seriesName, books, onClick }: SeriesCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sortedBooks = [...books].sort((a, b) => parseFloat(a.series_number || "0") - parseFloat(b.series_number || "0"));

  useEffect(() => {
    if (sortedBooks.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedBooks.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [sortedBooks.length]);

  const currentBook = sortedBooks[currentIndex];
  if (!currentBook) return null;

  const hasCover = !!currentBook.cover_path;

  return (
    <button
      onClick={onClick}
      className="book-card group text-left w-full rounded-lg overflow-hidden bg-card/60 border border-border/30"
    >
      <div className="relative aspect-[2/3] bg-gradient-to-br from-card to-secondary/30 overflow-hidden">
        {hasCover ? (
          <img
            key={currentBook.tsg_id}
            src={`asset:///${currentBook.cover_path?.replace(/\\/g, "/")}`}
            alt={currentBook.title}
            className="w-full h-full object-cover animate-fade-in"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 bg-secondary/10" key={`nocover-${currentBook.tsg_id}`}>
            <div className="text-center animate-fade-in">
              <p className="text-[11px] font-semibold text-foreground/40 leading-snug line-clamp-3" style={{ fontFamily: "\"Playfair Display\", serif" }}>
                {currentBook.title || "No Title"}
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute top-1.5 left-1.5 animate-fade-in" key={`badge-${currentBook.tsg_id}`}>
          <div className="bg-primary hover:bg-primary/90 rounded-full px-2 shadow-sm text-primary-foreground">
             <span className="text-[9px] font-bold tracking-widest leading-none">#{currentBook.series_number || "?"}</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 space-y-0.5 w-full min-w-0">
        <h3 className="text-xs font-medium truncate group-hover:text-primary transition-colors" title={seriesName}>
          {seriesName}
        </h3>
        <p className="text-[10px] text-muted-foreground truncate">
          {sortedBooks.length} book{sortedBooks.length !== 1 ? "s" : ""} • <span className="truncate" title={currentBook.author}>{currentBook.author || "Unknown"}</span>
        </p>
      </div>
    </button>
  );
}