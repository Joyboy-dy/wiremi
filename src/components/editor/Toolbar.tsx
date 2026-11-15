import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Camera, Clipboard, Copy, Download, Eraser, FileCode, FileJson, FileType, Grid3X3,
  Group, Image, Keyboard, Magnet, Maximize, Redo2, Trash2, Undo2, Ungroup, Wand2,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/components/ConfirmProvider';
import { LogoMark } from '@/components/Logo';
import { useEditor } from '../../contexts/EditorContext';
import { download, safeFileName, toAIPrompt, toHTML, toPNG, toSVG, toWireJSON } from '../../utils/exporters';
import { Divider, ToolButton } from './ToolButton';
import { AIPromptDialog, ShortcutsDialog, SnapshotsDialog } from './EditorDialogs';

export default function Toolbar({ onShowShortcuts, shortcutsOpen, setShortcutsOpen }: {
  onShowShortcuts: () => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { state, dispatch, currentPage, currentPageElements, zoomBy, zoomToFit, resetView } = useEditor();
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [aiPrompt, setAIPrompt] = useState<string | null>(null);

  const selected = state.selectedIds.length;
  const hasGroup = state.selectedIds.some(id => state.elements.find(e => e.id === id)?.type === 'group');
  const baseName = safeFileName(`${state.projectName} - ${currentPage.name}`);
  const isEmpty = currentPageElements.every(e => e.hidden);

  const exportAs = async (format: 'json' | 'copy' | 'html' | 'svg' | 'png' | 'ai') => {
    try {
      if (format === 'json') {
        download(`${safeFileName(state.projectName)}.wire.json`, toWireJSON(state.projectName, state.pages, state.elements), 'application/json');
      } else if (format === 'copy') {
        await navigator.clipboard.writeText(toWireJSON(state.projectName, state.pages, state.elements));
        toast.success('Project JSON copied to the clipboard.');
      } else if (format === 'html') {
        download(`${baseName}.html`, toHTML(state.projectName, currentPage.name, currentPageElements), 'text/html');
      } else if (format === 'svg') {
        download(`${baseName}.svg`, toSVG(currentPageElements, currentPage.canvasBackground), 'image/svg+xml');
      } else if (format === 'png') {
        const canvas = document.getElementById('wireframe-canvas');
        if (!canvas) return;
        const blob = await toPNG(canvas, currentPageElements, currentPage.canvasBackground);
        download(`${baseName}.png`, blob);
      } else {
        setAIPrompt(toAIPrompt(state.projectName, currentPage.name, currentPageElements));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    }
  };

  const clearPage = async () => {
    const ok = await confirm({
      title: `Clear "${currentPage.name}"?`,
      description: 'Every element on this page is removed. You can undo it with Ctrl+Z.',
      confirmLabel: 'Clear page',
      destructive: true,
    });
    if (ok) dispatch({ type: 'CLEAR_PAGE' });
  };

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.08] bg-[#1e1e1e] px-3">
        <ToolButton label="Back to projects" onClick={() => navigate('/')}>
          <ArrowLeft size={14} />
        </ToolButton>

        <span className="ml-1.5 flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold text-[#ddd]">
          <LogoMark size={18} /> Wiremi
        </span>

        <input
          aria-label="Project name"
          value={state.projectName}
          onChange={e => dispatch({ type: 'SET_PROJECT_NAME', name: e.target.value })}
          onBlur={e => !e.target.value.trim() && dispatch({ type: 'SET_PROJECT_NAME', name: 'Untitled Project' })}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className="ml-1 w-36 min-w-16 shrink border-b border-white/15 bg-transparent px-1 py-0.5 text-[13px] text-[#ccc] outline-none focus:border-[#4f8ef7]"
        />

        <Divider />
        <ToolButton label="Undo" shortcut="Ctrl Z" disabled={!state.past.length} onClick={() => dispatch({ type: 'UNDO' })}>
          <Undo2 size={14} />
        </ToolButton>
        <ToolButton label="Redo" shortcut="Ctrl Shift Z" disabled={!state.future.length} onClick={() => dispatch({ type: 'REDO' })}>
          <Redo2 size={14} />
        </ToolButton>

        <Divider />
        <ToolButton label="Duplicate" shortcut="Ctrl D" disabled={!selected} onClick={() => dispatch({ type: 'DUPLICATE_SELECTED' })}>
          <Copy size={14} />
        </ToolButton>
        <ToolButton label="Group" shortcut="Ctrl G" disabled={selected < 2} onClick={() => dispatch({ type: 'GROUP_SELECTED' })}>
          <Group size={14} />
        </ToolButton>
        <ToolButton label="Ungroup" shortcut="Ctrl Shift G" disabled={!hasGroup} onClick={() => dispatch({ type: 'UNGROUP_SELECTED' })}>
          <Ungroup size={14} />
        </ToolButton>
        <ToolButton label="Delete" shortcut="Del" disabled={!selected} onClick={() => dispatch({ type: 'DELETE_SELECTED' })}>
          <Trash2 size={14} />
        </ToolButton>

        <Divider />
        <ToolButton label={state.showGrid ? 'Hide grid' : 'Show grid'} active={state.showGrid} onClick={() => dispatch({ type: 'TOGGLE_GRID' })}>
          <Grid3X3 size={14} />
        </ToolButton>
        <ToolButton label={state.snapToGrid ? 'Snap to grid: on' : 'Snap to grid: off'} active={state.snapToGrid} onClick={() => dispatch({ type: 'TOGGLE_SNAP' })}>
          <Magnet size={14} />
        </ToolButton>

        <Divider />
        <ToolButton label="Zoom out" shortcut="Ctrl -" onClick={() => zoomBy(1 / 1.2)}>
          <ZoomOut size={14} />
        </ToolButton>
        <ToolButton label="Reset to 100%" shortcut="Ctrl 0" onClick={resetView} className="w-12 font-mono text-[11px]">
          {Math.round(state.scale * 100)}%
        </ToolButton>
        <ToolButton label="Zoom in" shortcut="Ctrl +" onClick={() => zoomBy(1.2)}>
          <ZoomIn size={14} />
        </ToolButton>
        <ToolButton label="Zoom to fit" shortcut="Shift 1" onClick={zoomToFit}>
          <Maximize size={14} />
        </ToolButton>

        <div className="min-w-2 flex-1" />

        <ToolButton label="Keyboard shortcuts" shortcut="?" onClick={onShowShortcuts}>
          <Keyboard size={14} />
        </ToolButton>
        <ToolButton label="Snapshots" onClick={() => setSnapshotsOpen(true)}>
          <Camera size={14} />
        </ToolButton>
        <ToolButton label="Clear this page" tone="danger" disabled={!currentPageElements.length} onClick={clearPage}>
          <Eraser size={14} />
        </ToolButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolButton label="Export" tone="primary" className="px-2.5">
              <Download size={14} /> Export
            </ToolButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Whole project</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => exportAs('json')}><FileJson /> JSON file</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs('copy')}><Clipboard /> Copy JSON</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">This page</DropdownMenuLabel>
            <DropdownMenuItem disabled={isEmpty} onSelect={() => exportAs('png')}><Image /> PNG image</DropdownMenuItem>
            <DropdownMenuItem disabled={isEmpty} onSelect={() => exportAs('svg')}><FileType /> SVG image</DropdownMenuItem>
            <DropdownMenuItem disabled={isEmpty} onSelect={() => exportAs('html')}><FileCode /> HTML page</DropdownMenuItem>
            <DropdownMenuItem disabled={isEmpty} onSelect={() => exportAs('ai')} className="text-[#7ab8ff]">
              <Wand2 /> Prompt for an AI builder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SnapshotsDialog open={snapshotsOpen} onOpenChange={setSnapshotsOpen} />
      <AIPromptDialog prompt={aiPrompt} onClose={() => setAIPrompt(null)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
