import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import type { CanvasElement, EditorState, ElementType, PageMeta } from '../types/editor';
import { absolutePosition, bounds, byId, flattenPage, selectionRoots, subtreeIds } from '../lib/elements';
import { getProjectData, saveProjectData } from '../utils/projectStorage';
import { createEditorState, editorReducer, MAX_SCALE, MIN_SCALE, type Action } from './editorReducer';

const SAVE_DELAY = 400;
const PASTE_OFFSET = 16;

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<Action>;
  currentPage: PageMeta;
  currentPageElements: CanvasElement[];
  /** The canvas viewport, registered by <Canvas>. */
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  toCanvasPoint: (clientX: number, clientY: number) => { x: number; y: number };
  addElementAt: (type: ElementType, clientX: number, clientY: number) => void;
  addElementAtCenter: (type: ElementType) => void;
  zoomBy: (factor: number, around?: { clientX: number; clientY: number }) => void;
  zoomToFit: () => void;
  resetView: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  canPaste: () => boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// Shared across projects so elements can be copied from one project to another.
let clipboard: CanvasElement[] = [];

export function EditorProvider({ children, projectId }: { children: React.ReactNode; projectId: string }) {
  const [state, dispatch] = useReducer(editorReducer, projectId, id => createEditorState(getProjectData(id)));
  const stateRef = useRef(state);
  stateRef.current = state;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pasteCount = useRef(0);

  const currentPage = state.pages.find(p => p.id === state.currentPageId) ?? state.pages[0];
  const currentPageElements = useMemo(
    () => state.elements.filter(e => e.pageId === state.currentPageId),
    [state.elements, state.currentPageId],
  );

  /* ------------------------------ Persistence ----------------------------- */

  const dirty = useRef(false);
  const saveErrorShown = useRef(false);
  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      saveProjectData(projectId, stateRef.current);
      saveErrorShown.current = false;
    } catch {
      if (!saveErrorShown.current) {
        saveErrorShown.current = true;
        toast.error('Could not save: browser storage is full. Export your work as JSON.');
      }
    }
  }, [projectId]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirty.current = true;
    const timer = setTimeout(save, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state.elements, state.pages, state.snapshots, state.projectName, state.pan, state.scale,
    state.showGrid, state.snapToGrid, state.currentPageId, save]);

  // Never lose the last edit when leaving the editor or closing the tab.
  useEffect(() => {
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      save();
    };
  }, [save]);

  /* --------------------------------- View --------------------------------- */

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const { pan, scale } = stateRef.current;
    return {
      x: (clientX - (rect?.left ?? 0) - pan.x) / scale,
      y: (clientY - (rect?.top ?? 0) - pan.y) / scale,
    };
  }, []);

  const viewportCenter = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect
      ? { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
      : { clientX: 0, clientY: 0 };
  }, []);

  const zoomBy = useCallback((factor: number, around?: { clientX: number; clientY: number }) => {
    const { pan, scale } = stateRef.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    const point = around ?? viewportCenter();
    const mx = point.clientX - (rect?.left ?? 0);
    const my = point.clientY - (rect?.top ?? 0);
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    dispatch({
      type: 'SET_VIEW',
      scale: next,
      pan: { x: mx - (mx - pan.x) * (next / scale), y: my - (my - pan.y) * (next / scale) },
    });
  }, [viewportCenter]);

  const resetView = useCallback(() => dispatch({ type: 'SET_VIEW', scale: 1, pan: { x: 0, y: 0 } }), []);

  const zoomToFit = useCallback(() => {
    const s = stateRef.current;
    const box = bounds(flattenPage(s.elements.filter(e => e.pageId === s.currentPageId)));
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!box || !rect) return resetView();
    // Breathing room around the content, smaller on a small canvas.
    const margin = Math.min(48, rect.width * 0.08, rect.height * 0.08);
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((rect.width - margin * 2) / box.w, (rect.height - margin * 2) / box.h, 1)),
    );
    dispatch({
      type: 'SET_VIEW',
      scale,
      pan: {
        x: rect.width / 2 - (box.x + box.w / 2) * scale,
        y: rect.height / 2 - (box.y + box.h / 2) * scale,
      },
    });
  }, [resetView]);

  /* ------------------------------- Elements ------------------------------- */

  const addElementAt = useCallback((type: ElementType, clientX: number, clientY: number) => {
    const { snapToGrid, gridSize } = stateRef.current;
    const p = toCanvasPoint(clientX, clientY);
    const snap = (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v));
    dispatch({ type: 'ADD_ELEMENT', elementType: type, x: snap(p.x), y: snap(p.y) });
  }, [toCanvasPoint]);

  const addElementAtCenter = useCallback((type: ElementType) => {
    const c = viewportCenter();
    // Offset each new element a little so repeated clicks don't stack exactly.
    const n = stateRef.current.elements.length % 8;
    addElementAt(type, c.clientX - 60 + n * 12, c.clientY - 40 + n * 12);
  }, [addElementAt, viewportCenter]);

  /* ------------------------------- Clipboard ------------------------------ */

  const copySelection = useCallback(() => {
    const s = stateRef.current;
    const pageEls = s.elements.filter(e => e.pageId === s.currentPageId);
    const roots = selectionRoots(s.selectedIds, pageEls);
    if (!roots.length) return;
    const index = byId(s.elements);
    const rootIds = new Set(roots.map(r => r.id));
    const ids = subtreeIds(rootIds, s.elements);
    // Roots are stored with page coordinates: they paste at the page level.
    clipboard = s.elements
      .filter(e => ids.has(e.id))
      .map(e => (rootIds.has(e.id) ? { ...e, ...absolutePosition(e, index), parentId: null } : e));
    pasteCount.current = 0;
  }, []);

  const cutSelection = useCallback(() => {
    copySelection();
    pasteCount.current = -1;
    dispatch({ type: 'DELETE_SELECTED' });
  }, [copySelection]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard.length) return;
    pasteCount.current += 1;
    dispatch({ type: 'PASTE', clipboard, offset: pasteCount.current * PASTE_OFFSET });
  }, []);

  const canPaste = useCallback(() => clipboard.length > 0, []);

  const value: EditorContextValue = {
    state, dispatch, currentPage, currentPageElements, viewportRef, toCanvasPoint,
    addElementAt, addElementAtCenter, zoomBy, zoomToFit, resetView,
    copySelection, cutSelection, pasteClipboard, canPaste,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
