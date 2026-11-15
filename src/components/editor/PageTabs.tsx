import { useState } from 'react';
import { Copy, MoreHorizontal, Palette, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfirm } from '@/components/ConfirmProvider';
import { useEditor } from '../../contexts/EditorContext';
import { DEFAULT_CANVAS_BACKGROUND } from '../../types/editor';
import { ToolButton } from './ToolButton';

const BACKGROUNDS = [DEFAULT_CANVAS_BACKGROUND, '#ffffff', '#eef2f7', '#f6f1e7', '#2b2b2b', '#111111'];

export default function PageTabs() {
  const { state, dispatch, currentPage } = useEditor();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const deletePage = async (id: string, name: string) => {
    const count = state.elements.filter(e => e.pageId === id).length;
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: count
        ? `Its ${count} element${count > 1 ? 's' : ''} will be removed too. You can undo it with Ctrl+Z.`
        : 'You can undo it with Ctrl+Z.',
      confirmLabel: 'Delete page',
      destructive: true,
    });
    if (ok) dispatch({ type: 'DELETE_PAGE', pageId: id });
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-t border-white/[0.08] bg-[#1a1a1a] px-2">
      <div role="tablist" aria-label="Pages" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {state.pages.map(page => {
          const active = page.id === state.currentPageId;
          return (
            <div
              key={page.id}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              onClick={() => dispatch({ type: 'SWITCH_PAGE', pageId: page.id })}
              onKeyDown={e => e.key === 'Enter' && dispatch({ type: 'SWITCH_PAGE', pageId: page.id })}
              onDoubleClick={() => setEditingId(page.id)}
              title="Double-click to rename"
              className={`flex h-7 shrink-0 cursor-pointer select-none items-center gap-1 rounded px-2.5 font-mono text-[11px] ${
                active ? 'border border-white/10 bg-[#2a2a2a] text-[#ddd]' : 'border border-transparent text-[#777] hover:text-[#bbb]'
              }`}
            >
              {editingId === page.id ? (
                <input
                  autoFocus
                  defaultValue={page.name}
                  aria-label="Page name"
                  onClick={e => e.stopPropagation()}
                  onBlur={e => { dispatch({ type: 'RENAME_PAGE', pageId: page.id, name: e.target.value }); setEditingId(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-24 bg-transparent font-mono text-[11px] text-[#ddd] outline-none"
                />
              ) : (
                <span className="max-w-40 truncate">{page.name}</span>
              )}
              {active && editingId !== page.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`${page.name} options`} onClick={e => e.stopPropagation()}
                      className="rounded p-0.5 text-[#777] hover:bg-white/10 hover:text-[#ddd]">
                      <MoreHorizontal size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  {/* Portal events still bubble to the tab in React: keep them in the menu. */}
                  <DropdownMenuContent side="top" align="start" onClick={e => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => setEditingId(page.id)}><Pencil /> Rename</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => dispatch({ type: 'DUPLICATE_PAGE', pageId: page.id })}>
                      <Copy /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={state.pages.length <= 1}
                      className="text-red-400 focus:text-red-300"
                      onSelect={() => deletePage(page.id, page.name)}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <ToolButton label="Add page" onClick={() => dispatch({ type: 'ADD_PAGE' })} className="border-transparent bg-transparent">
        <Plus size={13} />
      </ToolButton>

      <div className="flex-1" />

      <Popover>
        <PopoverTrigger asChild>
          <ToolButton label="Canvas background" className="border-transparent bg-transparent">
            <Palette size={12} />
            <span className="h-3 w-3 rounded-sm border border-white/30" style={{ background: currentPage.canvasBackground }} />
          </ToolButton>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto p-3">
          <div className="mb-2 text-xs text-muted-foreground">Canvas background</div>
          <div className="flex items-center gap-1.5">
            {BACKGROUNDS.map(color => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => dispatch({ type: 'SET_CANVAS_BACKGROUND', color })}
                className={`h-6 w-6 rounded border ${currentPage.canvasBackground === color ? 'border-[#4f8ef7] ring-1 ring-[#4f8ef7]' : 'border-white/20'}`}
                style={{ background: color }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom colour"
              value={currentPage.canvasBackground}
              onChange={e => dispatch({ type: 'SET_CANVAS_BACKGROUND', color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
