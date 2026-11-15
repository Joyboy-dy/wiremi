import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Copy, FileText, FolderOpen, Key, Loader2, MoreHorizontal, Pencil, Plus, Settings, Sparkles, Trash2,
  Upload, Wand2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/ConfirmProvider';
import { LogoMark } from '@/components/Logo';
import {
  createProject, deleteProject, duplicateProject, getProjectsList, renameProject,
} from '../utils/projectStorage';
import { DEFAULT_GROQ_MODEL, generateWireframe, loadAISettings, saveAISettings } from '../utils/aiWireframeBuilder';
import { parseWireJSON } from '../utils/exporters';
import { newId } from '../lib/elements';
import type { ProjectMeta } from '../types/editor';
import { DEFAULT_CANVAS_BACKGROUND } from '../types/editor';

const DRAFT_KEY = 'wire-new-project-form';

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [settings, setSettings] = useState(loadAISettings);
  useEffect(() => { if (open) setSettings(loadAISettings()); }, [open]);

  const save = () => {
    saveAISettings(settings);
    toast.success('Settings saved.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Needed for the AI builder only. Everything stays in this browser.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="groq-key" className="flex items-center gap-1.5"><Key size={12} /> Groq API key</Label>
            <Input id="groq-key" type="password" autoComplete="off" placeholder="gsk_..." value={settings.apiKey}
              onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))} />
            <p className="text-xs text-muted-foreground">
              Free at{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                console.groq.com/keys
              </a>
              .
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="groq-model">Model</Label>
            <Input id="groq-model" placeholder={DEFAULT_GROQ_MODEL} value={settings.model}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Any chat model listed in your Groq console.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyProject(projectName: string, elements = [] as ReturnType<typeof parseWireJSON>['elements'], pageId = newId()) {
  return {
    projectName,
    elements,
    pages: [{ id: pageId, name: 'Page 1', canvasBackground: DEFAULT_CANVAS_BACKGROUND }],
    currentPageId: pageId,
  };
}

function CreateProjectDialog({ open, onOpenChange, onCreated, onOpenSettings }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'choose' | 'ai'>('choose');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // The AI description is kept as a draft: it can take a while to write.
  useEffect(() => {
    if (!open) return;
    setPrompt(localStorage.getItem(DRAFT_KEY) || '');
    setMode('choose');
    setError('');
    setLoading(false);
  }, [open]);
  useEffect(() => { if (open) localStorage.setItem(DRAFT_KEY, prompt); }, [prompt, open]);

  const projectName = name.trim() || 'Untitled Project';

  const createBlank = () => {
    onCreated(createProject(emptyProject(projectName)));
    setName('');
  };

  const createWithAI = async () => {
    const settings = loadAISettings();
    if (!settings.apiKey) return setError('Add your Groq API key in Settings first.');
    if (!prompt.trim()) return setError('Describe the screen you want.');
    setLoading(true);
    setError('');
    try {
      const pageId = newId();
      const elements = await generateWireframe(prompt.trim(), pageId, settings);
      // The project is only created once the generation worked.
      const id = createProject(emptyProject(projectName, elements, pageId));
      localStorage.removeItem(DRAFT_KEY);
      setName('');
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The generation failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Name</Label>
          <Input id="project-name" placeholder="My wireframe" value={name} disabled={loading}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && mode === 'choose' && createBlank()} />
        </div>

        {mode === 'choose' ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={createBlank}
              className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-6 text-[#ccc] transition-colors hover:border-[#4f8ef7] hover:bg-[#4f8ef7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <FileText size={26} className="text-[#888]" />
              <span className="text-sm font-semibold">Blank canvas</span>
              <span className="text-xs text-[#777]">Start from scratch</span>
            </button>
            <button type="button" onClick={() => setMode('ai')}
              className="flex flex-col items-center gap-2 rounded-lg border border-[#4f8ef7]/25 bg-[#4f8ef7]/[0.06] px-4 py-6 text-[#ccc] transition-colors hover:border-[#4f8ef7] hover:bg-[#4f8ef7]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Wand2 size={26} className="text-[#4f8ef7]" />
              <span className="text-sm font-semibold">AI builder</span>
              <span className="text-xs text-[#777]">Describe your screen</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt">Describe the screen</Label>
              <Textarea id="ai-prompt" rows={5} value={prompt} disabled={loading} onChange={e => setPrompt(e.target.value)}
                placeholder="A dashboard with a sidebar, a header with a search bar, three stat cards and a table of recent orders…" />
            </div>
            {error && (
              <div role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}{' '}
                {error.includes('Settings') && (
                  <button type="button" onClick={onOpenSettings} className="underline">Open settings</button>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" disabled={loading} onClick={() => { setMode('choose'); setError(''); }}>Back</Button>
              <Button disabled={loading} onClick={createWithAI}>
                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                {loading ? 'Generating…' : 'Generate'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ project, onClose }: { project: ProjectMeta | null; onClose: (renamed: boolean) => void }) {
  const [name, setName] = useState('');
  useEffect(() => { if (project) setName(project.name); }, [project]);
  return (
    <Dialog open={!!project} onOpenChange={o => !o && onClose(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={e => {
          e.preventDefault();
          if (project) renameProject(project.id, name);
          onClose(true);
        }}>
          <Input autoFocus aria-label="Project name" value={name} onChange={e => setName(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<ProjectMeta[]>(getProjectsList);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState<ProjectMeta | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => setProjects(getProjectsList());

  const remove = async (project: ProjectMeta) => {
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      description: 'The project and its snapshots are removed from this browser. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteProject(project.id);
    refresh();
  };

  const importFile = async (file: File) => {
    try {
      const { projectName, pages, elements } = parseWireJSON(await file.text());
      const pageIds = new Set(pages.map(p => p.id));
      const data = pages.length
        ? { projectName, pages, elements: elements.filter(e => pageIds.has(e.pageId)), currentPageId: pages[0].id }
        : emptyProject(projectName, elements);
      // Files from the first version have elements without a known page.
      if (!pages.length) data.elements = elements.map(e => ({ ...e, pageId: data.currentPageId }));
      const id = createProject(data);
      toast.success(`"${projectName}" imported.`);
      navigate(`/editor/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-[#111] font-mono text-[#ccc]">
      <header className="flex items-center justify-between border-b border-white/[0.08] px-8 py-5">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="text-xl font-bold text-[#eee]">Wiremi</span>
          <span className="ml-2 text-xs text-[#666]">Wireframe builder</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="mr-1.5 h-3.5 w-3.5" /> Settings
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#eee]">Projects</h1>
          <div className="flex gap-2">
            <input ref={fileInput} type="file" accept=".json,application/json" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Import
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New project
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-20 text-center">
            <FolderOpen size={48} className="mb-4 text-[#333]" />
            <div className="mb-2 text-base text-[#777]">No projects yet</div>
            <div className="mb-6 text-sm text-[#555]">Create a wireframe, or import a .wire.json file.</div>
            <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Create a project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {projects.map(project => (
              <div key={project.id} role="link" tabIndex={0}
                onClick={() => navigate(`/editor/${project.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/editor/${project.id}`)}
                className="group cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 transition-colors hover:border-[#4f8ef7]/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-base font-semibold text-[#ddd]">{project.name}</div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={`${project.name} options`} onClick={e => e.stopPropagation()}
                        className="rounded p-1 text-[#666] hover:bg-white/10 hover:text-[#ddd]">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => setRenaming(project)}><Pencil /> Rename</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { duplicateProject(project.id); refresh(); }}><Copy /> Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-400 focus:text-red-300" onSelect={() => remove(project)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-3 text-xs text-[#666]">
                  <span>{project.pageCount} page{project.pageCount !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>Edited {new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen}
        onCreated={id => navigate(`/editor/${id}`)}
        onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <RenameDialog project={renaming} onClose={renamed => { setRenaming(null); if (renamed) refresh(); }} />
    </div>
  );
}
