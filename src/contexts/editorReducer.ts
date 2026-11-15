import type {
  Alignment,
  CanvasElement,
  EditorState,
  ElementType,
  HistoryEntry,
  LayerMove,
  PageMeta,
} from '../types/editor';
import { DEFAULT_CANVAS_BACKGROUND } from '../types/editor';
import {
  absolutePosition,
  byId,
  cloneSubtrees,
  createElement,
  isLocked,
  newId,
  selectionRoots,
  siblingsOf,
  subtreeIds,
  topZ,
} from '../lib/elements';

export const MAX_HISTORY = 100;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
/** Edits under the same key within this delay make a single undo step. */
const COALESCE_MS = 1000;
const DUPLICATE_OFFSET = 16;

export type ElementChanges = Partial<Omit<CanvasElement, 'id' | 'pageId'>>;

export type Action =
  | { type: 'ADD_ELEMENT'; elementType: ElementType; x: number; y: number }
  | { type: 'ADD_ELEMENTS'; elements: CanvasElement[] }
  | {
      type: 'UPDATE_ELEMENTS';
      updates: { id: string; changes: ElementChanges }[];
      /** History key: updates sharing it in a row make one undo step. */
      checkpoint?: string;
    }
  | { type: 'DELETE_SELECTED' }
  | { type: 'DUPLICATE_SELECTED' }
  | { type: 'PASTE'; clipboard: CanvasElement[]; offset: number }
  | { type: 'GROUP_SELECTED' }
  | { type: 'UNGROUP_SELECTED' }
  | { type: 'ALIGN_SELECTED'; alignment: Alignment }
  | { type: 'REORDER_SELECTED'; move: LayerMove }
  | { type: 'NUDGE_SELECTED'; dx: number; dy: number }
  | { type: 'SET_SELECTION'; ids: string[] }
  | { type: 'TOGGLE_SELECTION'; id: string }
  | { type: 'SELECT_ALL' }
  | { type: 'SET_VIEW'; pan?: { x: number; y: number }; scale?: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_SNAPSHOT'; name: string }
  | { type: 'RESTORE_SNAPSHOT'; id: string }
  | { type: 'DELETE_SNAPSHOT'; id: string }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'CLEAR_PAGE' }
  | { type: 'ADD_PAGE' }
  | { type: 'DUPLICATE_PAGE'; pageId: string }
  | { type: 'DELETE_PAGE'; pageId: string }
  | { type: 'SWITCH_PAGE'; pageId: string }
  | { type: 'RENAME_PAGE'; pageId: string; name: string }
  | { type: 'SET_CANVAS_BACKGROUND'; color: string };

export function createEditorState(
  saved: Partial<EditorState> | null,
  fallbackPageId: string = newId(),
): EditorState {
  const pages: PageMeta[] = saved?.pages?.length
    ? saved.pages
    : [{ id: fallbackPageId, name: 'Page 1', canvasBackground: DEFAULT_CANVAS_BACKGROUND }];
  const pageIds = new Set(pages.map(p => p.id));
  const currentPageId =
    saved?.currentPageId && pageIds.has(saved.currentPageId) ? saved.currentPageId : pages[0].id;
  // Older saves had no page on elements: they belong to the first page.
  const elements = (saved?.elements ?? []).map(el => ({
    ...el,
    pageId: el.pageId && pageIds.has(el.pageId) ? el.pageId : pages[0].id,
    props: el.props ?? {},
  }));
  return {
    elements,
    selectedIds: [],
    pan: saved?.pan ?? { x: 0, y: 0 },
    scale: saved?.scale ?? 1,
    showGrid: saved?.showGrid ?? true,
    snapToGrid: saved?.snapToGrid ?? false,
    gridSize: saved?.gridSize ?? 8,
    past: [],
    future: [],
    snapshots: saved?.snapshots ?? [],
    projectName: saved?.projectName || 'Untitled Project',
    pages,
    currentPageId,
    lastCheckpoint: null,
  };
}

/* --------------------------------- History -------------------------------- */

const entryOf = (state: EditorState): HistoryEntry => ({
  elements: state.elements,
  pages: state.pages,
  timestamp: Date.now(),
});

/** Records the current state as an undo step, merging runs of the same key. */
function checkpoint(state: EditorState, key?: string): EditorState {
  const now = Date.now();
  const last = state.lastCheckpoint;
  if (key && last?.key === key && now - last.at < COALESCE_MS) {
    return { ...state, lastCheckpoint: { key, at: now } };
  }
  const past = [...state.past, entryOf(state)].slice(-MAX_HISTORY);
  return { ...state, past, future: [], lastCheckpoint: key ? { key, at: now } : null };
}

function restore(state: EditorState, entry: HistoryEntry): EditorState {
  const pageIds = new Set(entry.pages.map(p => p.id));
  return {
    ...state,
    elements: entry.elements,
    pages: entry.pages,
    currentPageId: pageIds.has(state.currentPageId) ? state.currentPageId : entry.pages[0].id,
    selectedIds: state.selectedIds.filter(id => entry.elements.some(e => e.id === id)),
    lastCheckpoint: null,
  };
}

/* -------------------------------- Helpers --------------------------------- */

function pageElements(state: EditorState) {
  return state.elements.filter(e => e.pageId === state.currentPageId);
}

/** Selection roots on the current page that can be changed. */
function editableRoots(state: EditorState) {
  const index = byId(state.elements);
  return selectionRoots(state.selectedIds, pageElements(state)).filter(el => !isLocked(el, index));
}

function applyChanges(elements: CanvasElement[], changes: Map<string, ElementChanges>) {
  if (!changes.size) return elements;
  return elements.map(el => (changes.has(el.id) ? { ...el, ...changes.get(el.id) } : el));
}

/** Renumbers the z-index of siblings 1..n following the given order. */
function renumber(order: CanvasElement[]): Map<string, ElementChanges> {
  return new Map(order.map((el, i) => [el.id, { zIndex: i + 1 }]));
}

function align(state: EditorState, alignment: Alignment): EditorState {
  const roots = editableRoots(state);
  if (roots.length < 2) return state;
  const index = byId(state.elements);
  // Work in page coordinates so elements inside different groups line up too.
  const items = roots.map(el => {
    const abs = absolutePosition(el, index);
    return { el, x: abs.x, y: abs.y, ox: abs.x - el.x, oy: abs.y - el.y };
  });
  const minX = Math.min(...items.map(i => i.x));
  const maxX = Math.max(...items.map(i => i.x + i.el.w));
  const minY = Math.min(...items.map(i => i.y));
  const maxY = Math.max(...items.map(i => i.y + i.el.h));
  const target = new Map<string, { x?: number; y?: number }>();

  const distribute = (axis: 'x' | 'y') => {
    const size = axis === 'x' ? 'w' : 'h';
    const sorted = [...items].sort((a, b) => a[axis] - b[axis]);
    const total = sorted.reduce((s, i) => s + i.el[size], 0);
    const span = axis === 'x' ? maxX - minX : maxY - minY;
    const gap = (span - total) / (sorted.length - 1);
    let cursor = axis === 'x' ? minX : minY;
    for (const item of sorted) {
      target.set(item.el.id, { [axis]: cursor });
      cursor += item.el[size] + gap;
    }
  };

  for (const { el } of items) {
    if (alignment === 'left') target.set(el.id, { x: minX });
    if (alignment === 'right') target.set(el.id, { x: maxX - el.w });
    if (alignment === 'center-h') target.set(el.id, { x: (minX + maxX) / 2 - el.w / 2 });
    if (alignment === 'top') target.set(el.id, { y: minY });
    if (alignment === 'bottom') target.set(el.id, { y: maxY - el.h });
    if (alignment === 'center-v') target.set(el.id, { y: (minY + maxY) / 2 - el.h / 2 });
  }
  if (alignment === 'distribute-h') {
    if (items.length < 3) return state;
    distribute('x');
  }
  if (alignment === 'distribute-v') {
    if (items.length < 3) return state;
    distribute('y');
  }

  const changes = new Map<string, ElementChanges>();
  for (const item of items) {
    const t = target.get(item.el.id);
    if (!t) continue;
    changes.set(item.el.id, {
      ...(t.x !== undefined && { x: Math.round(t.x - item.ox) }),
      ...(t.y !== undefined && { y: Math.round(t.y - item.oy) }),
    });
  }
  const next = checkpoint(state);
  return { ...next, elements: applyChanges(next.elements, changes) };
}

function reorder(state: EditorState, move: LayerMove): EditorState {
  const roots = editableRoots(state);
  if (!roots.length) return state;
  const changes = new Map<string, ElementChanges>();
  const groups = new Map<string, CanvasElement[]>();
  for (const el of roots) {
    const key = el.parentId ?? '';
    groups.set(key, [...(groups.get(key) ?? []), el]);
  }
  for (const moving of groups.values()) {
    const movingIds = new Set(moving.map(e => e.id));
    const order = [...siblingsOf(moving[0], state.elements)].sort((a, b) => a.zIndex - b.zIndex);
    if (move === 'front' || move === 'back') {
      const rest = order.filter(e => !movingIds.has(e.id));
      const picked = order.filter(e => movingIds.has(e.id));
      const result = move === 'front' ? [...rest, ...picked] : [...picked, ...rest];
      renumber(result).forEach((v, k) => changes.set(k, v));
      continue;
    }
    // One step: swap each moving element with its neighbour, walking away from the edge.
    const result = [...order];
    const indices = result.map((e, i) => (movingIds.has(e.id) ? i : -1)).filter(i => i >= 0);
    if (move === 'forward') indices.reverse();
    for (const i of indices) {
      const j = move === 'forward' ? i + 1 : i - 1;
      if (j < 0 || j >= result.length || movingIds.has(result[j].id)) continue;
      [result[i], result[j]] = [result[j], result[i]];
    }
    renumber(result).forEach((v, k) => changes.set(k, v));
  }
  const next = checkpoint(state);
  return { ...next, elements: applyChanges(next.elements, changes) };
}

function group(state: EditorState): EditorState {
  const roots = editableRoots(state);
  if (roots.length < 2) return state;
  const index = byId(state.elements);
  const parentIds = new Set(roots.map(r => r.parentId));
  // Same parent: the group lives there. Mixed parents: it goes to the page root.
  const parentId = parentIds.size === 1 ? roots[0].parentId : null;
  const parent = parentId ? index.get(parentId) : undefined;
  const origin = parent ? absolutePosition(parent, index) : { x: 0, y: 0 };
  const items = roots.map(el => {
    const abs = absolutePosition(el, index);
    return { el, x: abs.x - origin.x, y: abs.y - origin.y };
  });
  const minX = Math.min(...items.map(i => i.x));
  const minY = Math.min(...items.map(i => i.y));
  const maxX = Math.max(...items.map(i => i.x + i.el.w));
  const maxY = Math.max(...items.map(i => i.y + i.el.h));

  const g = createElement('group', minX, minY, state.currentPageId, 0);
  const groupEl: CanvasElement = {
    ...g,
    parentId,
    w: Math.round(maxX - minX),
    h: Math.round(maxY - minY),
    // The group sits where its topmost member was; members keep their order inside it.
    zIndex:
      parentIds.size === 1
        ? Math.max(...roots.map(r => r.zIndex))
        : topZ(null, state.currentPageId, state.elements) + 1,
  };
  const changes = new Map<string, ElementChanges>(
    items.map(i => [i.el.id, { parentId: groupEl.id, x: Math.round(i.x - minX), y: Math.round(i.y - minY) }]),
  );
  const next = checkpoint(state);
  return {
    ...next,
    elements: [...applyChanges(next.elements, changes), groupEl],
    selectedIds: [groupEl.id],
  };
}

function ungroup(state: EditorState): EditorState {
  const groups = editableRoots(state).filter(el => el.type === 'group');
  if (!groups.length) return state;
  const groupIds = new Set(groups.map(g => g.id));
  const changes = new Map<string, ElementChanges>();
  const released: string[] = [];

  for (const g of groups) {
    const children = state.elements
      .filter(el => el.parentId === g.id)
      .sort((a, b) => a.zIndex - b.zIndex);
    released.push(...children.map(c => c.id));
    // Children take the group's place in the stacking order of its parent.
    const order = siblingsOf(g, state.elements)
      .filter(e => !groupIds.has(e.id) || e.id === g.id)
      .sort((a, b) => a.zIndex - b.zIndex)
      .flatMap(e => (e.id === g.id ? children : [e]));
    order.forEach((el, i) => {
      const base = changes.get(el.id) ?? {};
      const moved = el.parentId === g.id ? { parentId: g.parentId, x: g.x + el.x, y: g.y + el.y } : {};
      changes.set(el.id, { ...base, ...moved, zIndex: i + 1 });
    });
  }
  const next = checkpoint(state);
  return {
    ...next,
    elements: applyChanges(next.elements, changes).filter(el => !groupIds.has(el.id)),
    selectedIds: released,
  };
}

function duplicate(state: EditorState): EditorState {
  const roots = selectionRoots(state.selectedIds, pageElements(state));
  if (!roots.length) return state;
  let z = 0;
  const { clones, rootIds } = cloneSubtrees(
    roots.map(r => r.id),
    state.elements,
    root => ({
      x: root.x + DUPLICATE_OFFSET,
      y: root.y + DUPLICATE_OFFSET,
      locked: false,
      zIndex: topZ(root.parentId, root.pageId, state.elements) + ++z,
    }),
  );
  const next = checkpoint(state);
  return { ...next, elements: [...next.elements, ...clones], selectedIds: rootIds };
}

function paste(state: EditorState, clipboard: CanvasElement[], offset: number): EditorState {
  if (!clipboard.length) return state;
  const clipboardIds = new Set(clipboard.map(e => e.id));
  const roots = clipboard.filter(e => !e.parentId || !clipboardIds.has(e.parentId));
  let z = topZ(null, state.currentPageId, state.elements);
  const { clones, rootIds } = cloneSubtrees(
    roots.map(r => r.id),
    clipboard,
    root => ({ parentId: null, x: root.x + offset, y: root.y + offset, zIndex: ++z }),
  );
  const placed = clones.map(el => ({ ...el, pageId: state.currentPageId }));
  const next = checkpoint(state);
  return { ...next, elements: [...next.elements, ...placed], selectedIds: rootIds };
}

/* --------------------------------- Reducer -------------------------------- */

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'ADD_ELEMENT': {
      const el = createElement(
        action.elementType,
        action.x,
        action.y,
        state.currentPageId,
        topZ(null, state.currentPageId, state.elements) + 1,
      );
      const next = checkpoint(state);
      return { ...next, elements: [...next.elements, el], selectedIds: [el.id] };
    }
    case 'ADD_ELEMENTS': {
      if (!action.elements.length) return state;
      const next = checkpoint(state);
      return {
        ...next,
        elements: [...next.elements, ...action.elements],
        selectedIds: action.elements.filter(e => !e.parentId).map(e => e.id),
      };
    }
    case 'UPDATE_ELEMENTS': {
      const changes = new Map(action.updates.map(u => [u.id, u.changes]));
      if (!changes.size) return state;
      const next = checkpoint(state, action.checkpoint);
      return { ...next, elements: applyChanges(next.elements, changes) };
    }
    case 'DELETE_SELECTED': {
      const roots = editableRoots(state);
      if (!roots.length) return state;
      const ids = subtreeIds(roots.map(r => r.id), state.elements);
      const next = checkpoint(state);
      return { ...next, elements: next.elements.filter(el => !ids.has(el.id)), selectedIds: [] };
    }
    case 'DUPLICATE_SELECTED':
      return duplicate(state);
    case 'PASTE':
      return paste(state, action.clipboard, action.offset);
    case 'GROUP_SELECTED':
      return group(state);
    case 'UNGROUP_SELECTED':
      return ungroup(state);
    case 'ALIGN_SELECTED':
      return align(state, action.alignment);
    case 'REORDER_SELECTED':
      return reorder(state, action.move);
    case 'NUDGE_SELECTED': {
      const roots = editableRoots(state);
      if (!roots.length) return state;
      const changes = new Map<string, ElementChanges>(
        roots.map(el => [el.id, { x: el.x + action.dx, y: el.y + action.dy }]),
      );
      const next = checkpoint(state, 'nudge');
      return { ...next, elements: applyChanges(next.elements, changes) };
    }
    case 'SET_SELECTION':
      return { ...state, selectedIds: action.ids };
    case 'TOGGLE_SELECTION': {
      const has = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: has ? state.selectedIds.filter(i => i !== action.id) : [...state.selectedIds, action.id],
      };
    }
    case 'SELECT_ALL':
      return {
        ...state,
        selectedIds: pageElements(state).filter(e => !e.parentId && !e.hidden).map(e => e.id),
      };
    case 'SET_VIEW':
      return {
        ...state,
        pan: action.pan ?? state.pan,
        scale: action.scale === undefined ? state.scale : Math.min(MAX_SCALE, Math.max(MIN_SCALE, action.scale)),
      };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: !state.snapToGrid };
    case 'UNDO': {
      const entry = state.past[state.past.length - 1];
      if (!entry) return state;
      return {
        ...restore(state, entry),
        past: state.past.slice(0, -1),
        future: [entryOf(state), ...state.future],
      };
    }
    case 'REDO': {
      const entry = state.future[0];
      if (!entry) return state;
      return {
        ...restore(state, entry),
        past: [...state.past, entryOf(state)],
        future: state.future.slice(1),
      };
    }
    case 'SAVE_SNAPSHOT':
      return {
        ...state,
        snapshots: [
          ...state.snapshots,
          { id: newId(), name: action.name, elements: state.elements, pages: state.pages, timestamp: Date.now() },
        ],
      };
    case 'RESTORE_SNAPSHOT': {
      const snap = state.snapshots.find(s => s.id === action.id);
      if (!snap) return state;
      const pages = snap.pages?.length ? snap.pages : state.pages;
      const pageIds = new Set(pages.map(p => p.id));
      const next = checkpoint(state);
      return {
        ...next,
        pages,
        elements: snap.elements.filter(e => pageIds.has(e.pageId)),
        currentPageId: pageIds.has(state.currentPageId) ? state.currentPageId : pages[0].id,
        selectedIds: [],
      };
    }
    case 'DELETE_SNAPSHOT':
      return { ...state, snapshots: state.snapshots.filter(s => s.id !== action.id) };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'CLEAR_PAGE': {
      if (!pageElements(state).length) return state;
      const next = checkpoint(state);
      return {
        ...next,
        elements: next.elements.filter(e => e.pageId !== state.currentPageId),
        selectedIds: [],
      };
    }
    case 'ADD_PAGE': {
      const page: PageMeta = {
        id: newId(),
        name: nextPageName(state.pages),
        canvasBackground: DEFAULT_CANVAS_BACKGROUND,
      };
      const next = checkpoint(state);
      return { ...next, pages: [...next.pages, page], currentPageId: page.id, selectedIds: [], pan: { x: 0, y: 0 } };
    }
    case 'DUPLICATE_PAGE': {
      const source = state.pages.find(p => p.id === action.pageId);
      if (!source) return state;
      const page: PageMeta = { ...source, id: newId(), name: uniqueName(`${source.name} copy`, state.pages) };
      const roots = state.elements.filter(e => e.pageId === source.id && !e.parentId);
      const { clones } = cloneSubtrees(roots.map(r => r.id), state.elements);
      const at = state.pages.indexOf(source) + 1;
      const next = checkpoint(state);
      return {
        ...next,
        pages: [...next.pages.slice(0, at), page, ...next.pages.slice(at)],
        elements: [...next.elements, ...clones.map(c => ({ ...c, pageId: page.id }))],
        currentPageId: page.id,
        selectedIds: [],
      };
    }
    case 'DELETE_PAGE': {
      if (state.pages.length <= 1) return state;
      const at = state.pages.findIndex(p => p.id === action.pageId);
      if (at < 0) return state;
      const pages = state.pages.filter(p => p.id !== action.pageId);
      const next = checkpoint(state);
      return {
        ...next,
        pages,
        currentPageId:
          state.currentPageId === action.pageId ? pages[Math.max(0, at - 1)].id : state.currentPageId,
        elements: next.elements.filter(e => e.pageId !== action.pageId),
        selectedIds: [],
      };
    }
    case 'SWITCH_PAGE':
      if (action.pageId === state.currentPageId) return state;
      return { ...state, currentPageId: action.pageId, selectedIds: [] };
    case 'RENAME_PAGE': {
      const name = action.name.trim();
      if (!name) return state;
      return { ...state, pages: state.pages.map(p => (p.id === action.pageId ? { ...p, name } : p)) };
    }
    case 'SET_CANVAS_BACKGROUND':
      return {
        ...state,
        pages: state.pages.map(p => (p.id === state.currentPageId ? { ...p, canvasBackground: action.color } : p)),
      };
    default:
      return state;
  }
}

function nextPageName(pages: PageMeta[]) {
  let n = pages.length + 1;
  const names = new Set(pages.map(p => p.name));
  while (names.has(`Page ${n}`)) n++;
  return `Page ${n}`;
}

function uniqueName(base: string, pages: PageMeta[]) {
  const names = new Set(pages.map(p => p.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
