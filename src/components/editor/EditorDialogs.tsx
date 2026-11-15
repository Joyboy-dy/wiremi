import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Clipboard, RotateCcw, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ConfirmProvider';
import { useEditor } from '../../contexts/EditorContext';
import { SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

export function SnapshotsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, dispatch } = useEditor();
  const confirm = useConfirm();
  const [name, setName] = useState('');

  const save = () => {
    const label = name.trim() || `Snapshot ${state.snapshots.length + 1}`;
    dispatch({ type: 'SAVE_SNAPSHOT', name: label });
    setName('');
    toast.success(`Snapshot "${label}" saved.`);
  };

  const restore = async (id: string, label: string) => {
    const ok = await confirm({
      title: `Restore "${label}"?`,
      description: 'The project goes back to this snapshot. You can undo it with Ctrl+Z.',
      confirmLabel: 'Restore',
    });
    if (!ok) return;
    dispatch({ type: 'RESTORE_SNAPSHOT', id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Snapshots</DialogTitle>
          <DialogDescription>Save a version of the whole project to come back to later.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Snapshot ${state.snapshots.length + 1}`} />
          <Button type="submit">Save</Button>
        </form>
        <div className="max-h-64 overflow-y-auto">
          {state.snapshots.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No snapshots yet.</p>}
          {[...state.snapshots].reverse().map(snap => (
            <div key={snap.id} className="flex items-center gap-2 border-b border-white/[0.07] py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{snap.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(snap.timestamp).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => restore(snap.id, snap.name)}>
                <RotateCcw className="mr-1 h-3 w-3" /> Restore
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${snap.name}`}
                className="text-red-400 hover:text-red-300"
                onClick={() => dispatch({ type: 'DELETE_SNAPSHOT', id: snap.id })}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AIPromptDialog({ prompt, onClose }: { prompt: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open={prompt !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Prompt for an AI builder</DialogTitle>
          <DialogDescription>Paste it into any AI coding tool or website builder to build this page.</DialogDescription>
        </DialogHeader>
        <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed text-[#ccc]">
          {prompt}
        </pre>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={copy}>
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Clipboard className="mr-1 h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>On a Mac, use ⌘ instead of Ctrl.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
          {SHORTCUTS.map(s => (
            <div key={s.action} className="contents">
              <dt className="text-muted-foreground">{s.action}</dt>
              <dd className="text-right font-mono text-xs leading-5 text-[#ccc]">{s.keys}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
