export type ElementType =
  // Layout
  | 'frame' | 'card' | 'section' | 'row' | 'column' | 'group'
  // Navigation
  | 'navbar' | 'sidebar-nav' | 'breadcrumb'
  // Content
  | 'header' | 'text' | 'image' | 'background' | 'divider' | 'spacer'
  // UI Elements
  | 'button' | 'input' | 'checkbox' | 'radio' | 'toggle' | 'badge' | 'avatar' | 'icon'
  // Data display
  | 'table' | 'list' | 'card-grid' | 'chart'
  // Overlays
  | 'modal' | 'tooltip' | 'dropdown';

export interface ElementProps {
  label?: string;
  text?: string;
  placeholder?: string;
  columns?: number;
  rows?: number;
  checked?: boolean;
  variant?: string;
  src?: string;
  href?: string;
  items?: string[];
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  parentId: string | null;
  pageId: string;
  opacity: number;
  borderRadius: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  props: ElementProps;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: string;
  };
}

export interface PageMeta {
  id: string;
  name: string;
  canvasBackground: string;
}

export interface HistoryEntry {
  elements: CanvasElement[];
  pages: PageMeta[];
  timestamp: number;
}

export interface Snapshot {
  id: string;
  name: string;
  elements: CanvasElement[];
  /** Missing on snapshots saved before pages were recorded. */
  pages?: PageMeta[];
  timestamp: number;
}

export interface EditorState {
  elements: CanvasElement[];
  selectedIds: string[];
  pan: { x: number; y: number };
  scale: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
  snapshots: Snapshot[];
  projectName: string;
  pages: PageMeta[];
  currentPageId: string;
  /** Last history checkpoint, so a drag or a run of keystrokes makes one undo step. */
  lastCheckpoint?: { key: string; at: number } | null;
}

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
}

export type Alignment =
  | 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';

export const DEFAULT_CANVAS_BACKGROUND = '#f8f8f8';

export const ELEMENT_LABELS: Record<ElementType, string> = {
  frame: 'Frame', card: 'Card', section: 'Section', row: 'Row', column: 'Column', group: 'Group',
  navbar: 'Navbar', 'sidebar-nav': 'Sidebar', breadcrumb: 'Breadcrumb',
  header: 'Hero', text: 'Text', image: 'Image', background: 'Background', divider: 'Divider', spacer: 'Spacer',
  button: 'Button', input: 'Input', checkbox: 'Checkbox', radio: 'Radio', toggle: 'Toggle', badge: 'Badge',
  avatar: 'Avatar', icon: 'Icon',
  table: 'Table', list: 'List', 'card-grid': 'Card Grid', chart: 'Chart',
  modal: 'Modal', tooltip: 'Tooltip', dropdown: 'Dropdown',
};

export const DEFAULT_ELEMENT_SIZES: Record<ElementType, { w: number; h: number }> = {
  frame: { w: 400, h: 300 },
  card: { w: 240, h: 160 },
  section: { w: 600, h: 120 },
  row: { w: 400, h: 60 },
  column: { w: 120, h: 300 },
  group: { w: 200, h: 150 },
  navbar: { w: 600, h: 56 },
  'sidebar-nav': { w: 220, h: 400 },
  breadcrumb: { w: 300, h: 36 },
  header: { w: 500, h: 140 },
  text: { w: 240, h: 60 },
  image: { w: 200, h: 150 },
  background: { w: 400, h: 200 },
  divider: { w: 300, h: 8 },
  spacer: { w: 100, h: 32 },
  button: { w: 100, h: 36 },
  input: { w: 200, h: 40 },
  checkbox: { w: 120, h: 24 },
  radio: { w: 120, h: 24 },
  toggle: { w: 80, h: 28 },
  badge: { w: 60, h: 24 },
  avatar: { w: 48, h: 48 },
  icon: { w: 32, h: 32 },
  table: { w: 400, h: 200 },
  list: { w: 200, h: 180 },
  'card-grid': { w: 480, h: 220 },
  chart: { w: 320, h: 200 },
  modal: { w: 400, h: 280 },
  tooltip: { w: 160, h: 48 },
  dropdown: { w: 180, h: 120 },
};
