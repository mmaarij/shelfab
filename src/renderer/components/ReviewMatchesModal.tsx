import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from './ui/button';
import type { AutoLinkResult } from '../../shared/types';

interface ReviewMatchesModalProps {
  results: AutoLinkResult;
  onClose: () => void;
  onAccept: (tsgId: string, epubPath: string) => Promise<void>;
}

export function ReviewMatchesModal({ results, onClose, onAccept }: ReviewMatchesModalProps) {
  const [proposed, setProposed] = useState(results.proposed);
  const [successes] = useState(results.successful);
  const [successCount, setSuccessCount] = useState(results.successful.length);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (tsgId: string, epubPath: string, index: number) => {
    setProcessing(epubPath);
    try {
      await onAccept(tsgId, epubPath);
      setProposed(prev => prev.filter((_, i) => i !== index));
      setSuccessCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to accept match:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (index: number) => {
    setProposed(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border/30 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border/20 shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Auto-Link Results
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {successCount} {successCount === 1 ? 'file' : 'files'} linked automatically via ISBN.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-card transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {successes.length > 0 && (
            <div className="mb-6 space-y-3">
              <p className="text-sm font-medium text-emerald-500 mb-2">Successfully Linked via ISBN</p>
              {successes.map((match, idx) => (
                <div key={`success-${idx}`} className="flex gap-4 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 items-center">
                  {match.epubCoverPath && (
                    <div className="shrink-0 w-12 h-16 rounded overflow-hidden shadow-sm border border-border/20 bg-background/50 flex items-center justify-center">
                      <img src={`asset:///${match.epubCoverPath.replace(/\\/g, '/')}`} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{match.book.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{match.book.author}</p>
                  </div>
                  <div className="shrink-0 text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded border border-border/10 truncate max-w-[200px]">
                    {match.epubPath.split(/[/\\]/).pop()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {proposed.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 flex flex-col items-center justify-center space-y-2">
              <CheckCircle className="h-10 w-10 text-primary/50" />
              <p>No pending matches to review.</p>
              {results.failed.length > 0 && (
                <p className="text-xs text-muted-foreground/60">{results.failed.length} files could not be matched at all.</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground mb-4">Please review these proposed matches:</p>
              <div className="space-y-3">
                {proposed.map((match, idx) => (
                  <div key={`${match.epubPath}-${idx}`} className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-border/20 bg-card/30 items-center justify-between">
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                        {match.matchType === 'metadata' ? 'Matched via Metadata' : 'Matched via Filename'}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-background/50 p-2 rounded border border-border/10 flex gap-3">
                          {match.epubCoverPath && (
                            <div className="shrink-0 w-10 h-14 rounded overflow-hidden shadow-sm border border-border/20 bg-background/50 flex items-center justify-center -ml-1 mt-1 mb-1">
                              <img src={`asset:///${match.epubCoverPath.replace(/\\/g, '/')}`} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Local File</p>
                            <p className="text-sm truncate text-foreground font-medium" title={match.epubTitle}>{match.epubTitle || 'Unknown Title'}</p>
                            <p className="text-xs truncate text-muted-foreground" title={match.epubAuthor}>{match.epubAuthor || 'Unknown Author'}</p>
                            <p className="text-[10px] truncate text-muted-foreground/50 mt-1 font-mono" title={match.epubPath}>{match.epubPath.split(/[/\\]/).pop()}</p>
                          </div>
                        </div>
                        
                        <div className="bg-background/50 p-2 rounded border border-border/10 flex flex-col justify-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">StoryGraph Book</p>
                          <p className="text-sm truncate text-foreground font-medium" title={match.book.title}>{match.book.title}</p>
                          <p className="text-xs truncate text-muted-foreground" title={match.book.author}>{match.book.author}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-1">Confidence Score: {match.confidence}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col mt-4 sm:mt-0 shrink-0">
                      <Button 
                        size="sm" 
                        onClick={() => handleAccept(match.book.tsg_id, match.epubPath, idx)}
                        disabled={processing === match.epubPath}
                        className="w-full sm:w-28 h-8 text-xs bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 border border-emerald-600/20"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReject(idx)}
                        disabled={processing === match.epubPath}
                        className="w-full sm:w-28 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border/20 flex justify-end bg-muted/10 shrink-0">
          <Button onClick={onClose} variant="secondary">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}