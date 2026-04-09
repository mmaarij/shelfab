import React, { useState } from 'react';
import { FolderOpen, ArrowRight, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import logoUrl from '../assets/shelfab-logo.svg';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [libraryFolder, setLibraryFolder] = useState('');
  const [syncRead, setSyncRead] = useState(true);
  const [syncCurrentlyReading, setSyncCurrentlyReading] = useState(true);
  const [syncToRead, setSyncToRead] = useState(true);
  const [saving, setSaving] = useState(false);

  const handlePickFolder = async () => {
    const folder = await window.electronAPI.pickFolder();
    if (folder) setLibraryFolder(folder);
  };

  const handleFinish = async () => {
    if (!username.trim() || !libraryFolder) return;
    setSaving(true);
    try {
      await window.electronAPI.completeOnboarding(username.trim(), libraryFolder, syncRead, syncCurrentlyReading, syncToRead);
      onComplete();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logoUrl} alt="Shelfab Logo" className="w-14 h-14" />
          </div>
          <h1 className="text-4xl font-normal" style={{ fontFamily: "'Belanosima', sans-serif", color: '#f14900' }}>
            Shelfab
          </h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-wide">
            Fabricate your shelf
          </p>
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                StoryGraph Username
              </label>
              <Input
                id="onboarding-username"
                placeholder="your-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-base bg-card border-border/60"
                autoFocus
              />
            </div>

            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500/70 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-200/60 leading-relaxed">
                Your StoryGraph profile must be set to <strong className="text-amber-200/80">Public</strong> for syncing to work.
              </p>
            </div>

            <Button
              onClick={() => setStep(1)}
              disabled={!username.trim()}
              className="w-full h-11"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Managed Library Folder
              </label>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                EPUBs will be copied here with updated metadata and covers.
              </p>
              <button
                onClick={handlePickFolder}
                className="w-full h-12 px-4 rounded-md border border-border/60 bg-card text-left text-sm hover:border-primary/40 transition-colors flex items-center gap-3"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={libraryFolder ? 'text-foreground truncate' : 'text-muted-foreground'}>
                  {libraryFolder || 'Choose a folder...'}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Sync Preferences
              </label>
              <Checkbox
                id="onboard-sync-read"
                label="Sync books you've read"
                checked={syncRead}
                onChange={(e) => setSyncRead((e.target as HTMLInputElement).checked)}
              />
              <Checkbox
                id="onboard-sync-currentlyreading"
                label="Sync your currently reading"
                checked={syncCurrentlyReading}
                onChange={(e) => setSyncCurrentlyReading((e.target as HTMLInputElement).checked)}
              />
              <Checkbox
                id="onboard-sync-toread"
                label="Sync your to-read pile"
                checked={syncToRead}
                onChange={(e) => setSyncToRead((e.target as HTMLInputElement).checked)}
              />
            </div>

            <Button
              onClick={handleFinish}
              disabled={saving || !libraryFolder}
              className="w-full h-11"
            >
              {saving ? 'Setting up...' : 'Get Started'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <button
              onClick={() => setStep(0)}
              className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
