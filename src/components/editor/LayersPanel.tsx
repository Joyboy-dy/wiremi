import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import type { CanvasElement } from '../../types/editor';
import {
  Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight,
  Frame, Square, Rows3, Columns3, Group, PanelTop, PanelLeft,
  ChevronsRight, Heading, Type, Image, Paintbrush, Minus, ArrowUpDown,
  RectangleHorizontal, TextCursorInput, CheckSquare, Circle, ToggleLeft,
  Tag, User, Star, Table, List, LayoutGrid, BarChart3,
  Layers, MessageSquare, ChevronDownSquare,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  frame: <Frame size={12} />, card: <Square size={12} />, section: <Rows3 size={12} />,
  row: <Rows3 size={12} />, column: <Columns3 size={12} />, group: <Group size={12} />,
  navbar: <PanelTop size={12} />, 'sidebar-nav': <PanelLeft size={12} />, breadcrumb: <ChevronsRight size={12} />,
  header: <Heading size={12} />, text: <Type size={12} />, image: <Image size={12} />,
  background: <Paintbrush size={12} />, divider: <Minus size={12} />, spacer: <ArrowUpDown size={12} />,
  button: <RectangleHorizontal size={12} />, input: <TextCursorInput size={12} />,
  checkbox: <CheckSquare size={12} />, radio: <Circle size={12} />, toggle: <ToggleLeft size={12} />,
  badge: <Tag size={12} />, avatar: <User size={12} />, icon: <Star size={12} />,
  table: <Table size={12} />, list: <List size={12} />, 'card-grid': <LayoutGrid size={12} />,
  chart: <BarChart3 size={12} />, modal: <Layers size={12} />, tooltip: <MessageSquare size={12} />,
  dropdown: <ChevronDownSquare size={12} />,
};

interface RowProps {
  element: CanvasElement;
  depth: number;
  childrenOf: (id: string) => CanvasElement[];
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onToggle: (id: string, field: 'hidden' | 'locked') => void;
  onRename: (id: string, label: string) => void;
}

function LayerRow({ element, depth, childrenOf, selectedIds, onSelect, onToggle, onRename }: RowProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const isSelected = selectedIds.includes(element.id);
  const children = childrenOf(element.id);
  const hasChildren = children.length > 0;
  const iconBtn = 'flex items-center rounded px-0.5 py-0.5 hover:bg-white/10';

  return (
    <>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        style={{ paddingLeft: 6 + depth * 14 }}
        className={`group flex cursor-pointer select-none items-center gap-1 border-l-2 py-[3px] pr-2 ${
          isSelected ? 'border-[#4f8ef7] bg-[#4f8ef7]/20' : 'border-transparent hover:bg-white/5'
        }`}
        onClick={e => onSelect(element.id, e.shiftKey || e.ctrlKey || e.metaKey)}
        onDoubleClick={() => setEditing(true)}
        title="Double-click to rename"
      >
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          tabIndex={hasChildren ? 0 : -1}
          className={`flex w-3 shrink-0 items-center justify-center text-[#666] ${hasChildren ? '' : 'invisible'}`}
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <span className="flex w-3.5 shrink-0 items-center justify-center text-[#888]">
          {iconMap[element.type] || <Square size={12} />}
        </span>
        {editing ? (
          <input
            autoFocus
            defaultValue={element.label}
            aria-label="Layer name"
            onClick={e => e.stopPropagation()}
            onBlur={e => { onRename(element.id, e.target.value); setEditing(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="min-w-0 flex-1 rounded border border-[#4f8ef7] bg-black/40 px-1 text-xs text-[#ddd] outline-none"
          />
        ) : (
          <span
            className={`min-w-0 flex-1 truncate text-xs ${
              element.hidden ? 'text-[#555] line-through' : isSelected ? 'text-[#adf]' : element.locked ? 'text-[#777]' : 'text-[#bbb]'
            }`}
          >
            {element.label}
          </span>
        )}
        <button
          type="button"
          aria-label={element.hidden ? 'Show' : 'Hide'}
          className={`${iconBtn} ${element.hidden ? 'text-[#777]' : 'text-[#888] opacity-0 focus:opacity-100 group-hover:opacity-100'}`}
          onClick={e => { e.stopPropagation(); onToggle(element.id, 'hidden'); }}
        >
          {element.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          aria-label={element.locked ? 'Unlock' : 'Lock'}
          className={`${iconBtn} ${element.locked ? 'text-[#fb923c]' : 'text-[#888] opacity-0 focus:opacity-100 group-hover:opacity-100'}`}
          onClick={e => { e.stopPropagation(); onToggle(element.id, 'locked'); }}
        >
          {element.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>
      {expanded && children.map(child => (
        <LayerRow key={child.id} element={child} depth={depth + 1} childrenOf={childrenOf} selectedIds={selectedIds}
          onSelect={onSelect} onToggle={onToggle} onRename={onRename} />
      ))}
    </>
  );
}

export default function LayersPanel() {
  const { state, dispatch, currentPageElements } = useEditor();
  // Topmost first, like the stacking order on the canvas.
  const byZ = (a: CanvasElement, b: CanvasElement) => b.zIndex - a.zIndex;
  const rootEls = currentPageElements.filter(e => !e.parentId).sort(byZ);
  const childrenOf = (id: string) => currentPageElements.filter(e => e.parentId === id).sort(byZ);

  const onSelect = (id: string, additive: boolean) =>
    dispatch(additive ? { type: 'TOGGLE_SELECTION', id } : { type: 'SET_SELECTION', ids: [id] });
  const onToggle = (id: string, field: 'hidden' | 'locked') => {
    const el = state.elements.find(e => e.id === id);
    if (el) dispatch({ type: 'UPDATE_ELEMENTS', updates: [{ id, changes: { [field]: !el[field] } }] });
  };
  const onRename = (id: string, label: string) => {
    const el = state.elements.find(e => e.id === id);
    if (el && label.trim() && label.trim() !== el.label) {
      dispatch({ type: 'UPDATE_ELEMENTS', updates: [{ id, changes: { label: label.trim() } }] });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-white/[0.07] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#666]">
        Layers · {currentPageElements.length}
      </div>
      {rootEls.length === 0 && (
        <div className="px-3 py-5 text-center text-xs text-[#555]">Add components to start building.</div>
      )}
      <div role="tree" aria-label="Layers">
        {rootEls.map(el => (
          <LayerRow key={el.id} element={el} depth={0} childrenOf={childrenOf} selectedIds={state.selectedIds}
            onSelect={onSelect} onToggle={onToggle} onRename={onRename} />
        ))}
      </div>
    </div>
  );
}
