import React from 'react';
import { Settings, RefreshCw, Upload, Loader2, Heart } from 'lucide-react';
import { Button } from './ui/button';
import logoUrl from '../assets/shelfab-logo.svg';

interface HeaderProps {
  onSettingsClick: () => void;
  onSyncClick: () => void;
  onReExportClick: () => void;
  syncing: boolean;
  reExporting: boolean;
}

export function Header({ onSettingsClick, onSyncClick, onReExportClick, syncing, reExporting }: HeaderProps) {
  return (
    <header className="drag-region sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5 no-drag">
          <img src={logoUrl} alt="Shelfab Logo" className="w-6 h-6" />
          <h1 className="text-xl font-normal" style={{ fontFamily: "'Belanosima', sans-serif", color: '#f14900' }}>
            Shelfab
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 no-drag">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.electronAPI.openExternal('https://ko-fi.com/mmaarij')}
            title="Support me on Ko-fi"
            className="text-xs gap-1.5 text-muted-foreground hover:text-[#ff5e5b] hover:bg-[#ff5e5b]/10 mr-1"
          >
            <Heart className="h-3.5 w-3.5" />
            Support
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReExportClick}
            disabled={reExporting}
            title="Re-export all EPUBs to library folder"
            className="text-xs gap-1.5 text-muted-foreground"
          >
            {reExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Re-export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSyncClick}
            disabled={syncing}
            title="Sync from StoryGraph"
            className="text-xs gap-1.5 text-muted-foreground"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync
          </Button>
          <div className="w-px h-5 bg-border/40 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            title="Settings"
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
