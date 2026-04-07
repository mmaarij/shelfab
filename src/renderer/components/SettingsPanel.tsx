import React, { useState, useEffect } from 'react';
import { FolderOpen, X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [username, setUsername] = useState('');
  const [libraryFolder, setLibraryFolder] = useState('');
  const [syncRead, setSyncRead] = useState(true);
  const [syncToRead, setSyncToRead] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await window.electronAPI.getSetting('tsg_username');
      const f = await window.electronAPI.getSetting('libraryFolder');
      const sr = await window.electronAPI.getSetting('syncRead');
      const st = await window.electronAPI.getSetting('syncToRead');
      if (u) setUsername(u);
      if (f) setLibraryFolder(f);
      if (sr !== null) setSyncRead(sr !== 'false');
      if (st !== null) setSyncToRead(st !== 'false');
    };
    load();
  }, []);

  const handlePickFolder = async () => {
    const folder = await window.electronAPI.pickFolder();
    if (folder) {
      setLibraryFolder(folder);
      await window.electronAPI.setSetting('libraryFolder', folder);
    }
  };

  const handleSave = async () => {
    await window.electronAPI.setSetting('tsg_username', username.trim());
    await window.electronAPI.setSetting('syncRead', String(syncRead));
    await window.electronAPI.setSetting('syncToRead', String(syncToRead));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearLibrary = () => {
    setShowClearModal(true);
  };

  const confirmClearLibrary = async () => {
    await window.electronAPI.clearLibrary(deleteFiles);
    window.location.reload(); // Refresh to show empty state
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border/30 animate-slide-in overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/20 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-card transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              StoryGraph Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              className="h-9 text-sm bg-card/50 border-border/30"
            />
          </div>

          {/* Library Folder */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Library Folder
            </label>
            <button
              onClick={handlePickFolder}
              className="w-full h-9 px-3 rounded-md border border-border/30 bg-card/50 text-left text-xs hover:border-primary/30 transition-colors flex items-center gap-2"
            >
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className={libraryFolder ? 'text-foreground/80 truncate' : 'text-muted-foreground/40'}>
                {libraryFolder || 'Choose folder...'}
              </span>
            </button>
          </div>

          {/* Sync preferences */}
          <div className="space-y-3">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Sync Preferences
            </label>
            <Checkbox
              id="settings-sync-read"
              label="Sync books you've read"
              checked={syncRead}
              onChange={(e) => setSyncRead((e.target as HTMLInputElement).checked)}
            />
            <Checkbox
              id="settings-sync-toread"
              label="Sync your to-read pile"
              checked={syncToRead}
              onChange={(e) => setSyncToRead((e.target as HTMLInputElement).checked)}
            />
          </div>

          <Button onClick={handleSave} className="w-full h-9 text-xs">
            {saved ? 'Saved ✓' : 'Save Settings'}
          </Button>

          {/* Destructive Actions */}
          <div className="pt-6 mt-6 border-t border-border/20 space-y-3">
            <h3 className="text-[10px] font-medium text-red-500/60 uppercase tracking-widest">
              Destructive Actions
            </h3>
            <button
              onClick={handleClearLibrary}
              className="w-full h-9 px-3 rounded-md border border-red-500/20 bg-red-500/5 text-red-500 text-xs hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Clear Library & Reset App
            </button>
            <p className="text-[10px] text-muted-foreground/40 leading-relaxed px-1 text-center">
              Wipes all metadata. Optionally deletes local files.
            </p>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-border/20 space-y-2">
            <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
              Read/To-Read status is a one-way sync from StoryGraph.
              It cannot be changed locally and will update on next sync.
            </p>
          </div>
        </div>
      </div>

      {/* Clear Library Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClearModal(false)} />
          <div className="relative bg-background border border-border/30 rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Clear Library</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to clear your library? This will delete all book data from the app. This action cannot be undone.
              </p>
              
              <div className="pt-2">
                <Checkbox
                  id="delete-files"
                  label="Also delete all EPUB files from your managed library folder"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles((e.target as HTMLInputElement).checked)}
                />
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 border-t border-border/20 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowClearModal(false)}
                className="h-8 text-xs px-4"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmClearLibrary}
                className="h-8 text-xs px-4 bg-red-500 hover:bg-red-600 text-white border-0"
              >
                Clear Library
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
