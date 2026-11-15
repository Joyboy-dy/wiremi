import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import ComponentLibrary from './ComponentLibrary';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import PageTabs from './PageTabs';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export default function EditorLayout() {
  const [leftTab, setLeftTab] = useState<'library' | 'layers'>('library');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useKeyboardShortcuts(showShortcuts);

  const tab = (id: 'library' | 'layers', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={leftTab === id}
      onClick={() => setLeftTab(id)}
      className={cn(
        'flex-1 border-b-2 px-1 py-2 font-mono text-xs transition-colors',
        leftTab === id
          ? 'border-[#4f8ef7] bg-[#4f8ef7]/15 text-[#7ab8ff]'
          : 'border-transparent text-[#777] hover:text-[#aaa]',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1a1a1a]">
      <Toolbar onShowShortcuts={showShortcuts} shortcutsOpen={shortcutsOpen} setShortcutsOpen={setShortcutsOpen} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#1e1e1e]">
          <div role="tablist" className="flex border-b border-white/[0.08]">
            {tab('library', 'Components')}
            {tab('layers', 'Layers')}
          </div>
          <div className="flex-1 overflow-hidden">{leftTab === 'library' ? <ComponentLibrary /> : <LayersPanel />}</div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <Canvas />
          <PageTabs />
        </main>

        <aside className="flex w-[248px] shrink-0 flex-col overflow-hidden border-l border-white/[0.08] bg-[#1e1e1e]">
          <div className="border-b border-white/[0.08] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            Properties
          </div>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
