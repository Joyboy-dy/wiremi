import React, { useState } from 'react';
import type { ElementType } from '../../types/editor';
import { useEditor } from '../../contexts/EditorContext';
import { DRAG_TYPE } from './Canvas';
import {
  Frame, Square, Rows3, Columns3, PanelTop, PanelLeft, ChevronsRight,
  Heading, Type, Image, Paintbrush, Minus, ArrowUpDown,
  RectangleHorizontal, TextCursorInput, CheckSquare, Circle, ToggleLeft,
  Tag, User, Star, Table, List, LayoutGrid, BarChart3,
  Layers, MessageSquare, ChevronDown as ChevronDownIcon, Search,
  ChevronUp, ChevronDownSquare
} from 'lucide-react';

interface LibraryItem {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
}

interface Category {
  name: string;
  items: LibraryItem[];
}

const CATEGORIES: Category[] = [
  {
    name: 'Layout',
    items: [
      { type: 'frame', label: 'Frame', icon: <Frame size={13} /> },
      { type: 'card', label: 'Card', icon: <Square size={13} /> },
      { type: 'section', label: 'Section', icon: <Rows3 size={13} /> },
      { type: 'row', label: 'Row', icon: <Rows3 size={13} /> },
      { type: 'column', label: 'Column', icon: <Columns3 size={13} /> },
    ],
  },
  {
    name: 'Navigation',
    items: [
      { type: 'navbar', label: 'Navbar', icon: <PanelTop size={13} /> },
      { type: 'sidebar-nav', label: 'Sidebar', icon: <PanelLeft size={13} /> },
      { type: 'breadcrumb', label: 'Breadcrumb', icon: <ChevronsRight size={13} /> },
    ],
  },
  {
    name: 'Content',
    items: [
      { type: 'header', label: 'Hero', icon: <Heading size={13} /> },
      { type: 'text', label: 'Text', icon: <Type size={13} /> },
      { type: 'image', label: 'Image', icon: <Image size={13} /> },
      { type: 'background', label: 'Background', icon: <Paintbrush size={13} /> },
      { type: 'divider', label: 'Divider', icon: <Minus size={13} /> },
      { type: 'spacer', label: 'Spacer', icon: <ArrowUpDown size={13} /> },
    ],
  },
  {
    name: 'UI Elements',
    items: [
      { type: 'button', label: 'Button', icon: <RectangleHorizontal size={13} /> },
      { type: 'input', label: 'Input', icon: <TextCursorInput size={13} /> },
      { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={13} /> },
      { type: 'radio', label: 'Radio', icon: <Circle size={13} /> },
      { type: 'toggle', label: 'Toggle', icon: <ToggleLeft size={13} /> },
      { type: 'badge', label: 'Badge', icon: <Tag size={13} /> },
      { type: 'avatar', label: 'Avatar', icon: <User size={13} /> },
      { type: 'icon', label: 'Icon', icon: <Star size={13} /> },
    ],
  },
  {
    name: 'Data',
    items: [
      { type: 'table', label: 'Table', icon: <Table size={13} /> },
      { type: 'list', label: 'List', icon: <List size={13} /> },
      { type: 'card-grid', label: 'Card Grid', icon: <LayoutGrid size={13} /> },
      { type: 'chart', label: 'Chart', icon: <BarChart3 size={13} /> },
    ],
  },
  {
    name: 'Overlays',
    items: [
      { type: 'modal', label: 'Modal', icon: <Layers size={13} /> },
      { type: 'tooltip', label: 'Tooltip', icon: <MessageSquare size={13} /> },
      { type: 'dropdown', label: 'Dropdown', icon: <ChevronDownSquare size={13} /> },
    ],
  },
];

function DraggableItem({ item, onAdd }: { item: LibraryItem; onAdd: (type: ElementType) => void }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={() => onAdd(item.type)}
      title={`Click or drag to add a ${item.label.toLowerCase()}`}
      className="flex w-full cursor-grab select-none items-center gap-2 rounded border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-left font-mono text-xs text-[#ccc] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
    >
      <span className="flex w-4 items-center justify-center text-[#888]">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function ComponentLibrary() {
  const { addElementAtCenter } = useEditor();
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.name)));
  const [search, setSearch] = useState('');

  const toggle = (name: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const filtered = search
    ? CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.items.length)
    : CATEGORIES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search components..."
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '5px 8px 5px 28px', color: '#ccc', fontSize: 12, outline: 'none',
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '20px 12px', color: '#666', fontSize: 12, textAlign: 'center' }}>
            No component matches “{search}”.
          </div>
        )}
        {filtered.map(cat => (
          <div key={cat.name}>
            <button
              onClick={() => toggle(cat.name)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 10px', background: 'none', border: 'none', color: '#888',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <span>{cat.name}</span>
              {openCats.has(cat.name) ? <ChevronUp size={12} style={{ opacity: 0.5 }} /> : <ChevronDownIcon size={12} style={{ opacity: 0.5 }} />}
            </button>
            {(search || openCats.has(cat.name)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 8px 6px' }}>
                {cat.items.map(item => <DraggableItem key={item.type} item={item} onAdd={addElementAtCenter} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
