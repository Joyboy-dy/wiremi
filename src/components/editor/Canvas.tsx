import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import type { CanvasElement, ElementType } from '../../types/editor';
import { ELEMENT_LABELS } from '../../types/editor';
import { absolutePosition, ancestors, byId, isLocked, selectionRoots } from '../../lib/elements';
import WireframeElement from './WireframeElement';

export const DRAG_TYPE = 'application/x-wiremi-element';
const DRAG_THRESHOLD = 3;
const MIN_SIZE = 8;

type Interaction =
  | { kind: 'pan'; startX: number; startY: number; pan: { x: number; y: number } }
  | { kind: 'marquee'; start: { x: number; y: number }; additive: string[] }
  | {
      kind: 'move';
      startX: number;
      startY: number;
      origins: { id: string; x: number; y: number }[];
      started: boolean;
      key: string;
    }
  | {
      kind: 'resize';
      id: string;
      handle: string;
      startX: number;
      startY: number;
      origin: { x: number; y: number; w: number; h: number };
      key: string;
    };

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Dot colour that stays visible on light and dark canvas backgrounds. */
function dotColor(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
}

let interactionCounter = 0;

export default function Canvas() {
  const { state, dispatch, currentPage, currentPageElements, viewportRef, toCanvasPoint, addElementAt, zoomBy } =
    useEditor();
  const stateRef = useRef(state);
  stateRef.current = state;
  const elementsRef = useRef(currentPageElements);
  elementsRef.current = currentPageElements;

  const interaction = useRef<Interaction | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const snap = useCallback((v: number) => {
    const { snapToGrid, gridSize } = stateRef.current;
    return snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v);
  }, []);

  /* --------------------------------- Keys --------------------------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditable(e.target)) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    const reset = () => setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  /* --------------------------------- Wheel -------------------------------- */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch on a trackpad also arrives as ctrl + wheel.
        zoomBy(Math.exp(-e.deltaY * 0.0025), { clientX: e.clientX, clientY: e.clientY });
        return;
      }
      const { pan } = stateRef.current;
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      dispatch({ type: 'SET_VIEW', pan: { x: pan.x - dx, y: pan.y - dy } });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [dispatch, viewportRef, zoomBy]);

  /* ------------------------------ Pointer moves --------------------------- */

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const it = interaction.current;
      if (!it) return;
      e.preventDefault();
      const { scale } = stateRef.current;

      if (it.kind === 'pan') {
        dispatch({ type: 'SET_VIEW', pan: { x: it.pan.x + e.clientX - it.startX, y: it.pan.y + e.clientY - it.startY } });
        return;
      }

      if (it.kind === 'marquee') {
        const p = toCanvasPoint(e.clientX, e.clientY);
        const rect = {
          x: Math.min(it.start.x, p.x),
          y: Math.min(it.start.y, p.y),
          w: Math.abs(p.x - it.start.x),
          h: Math.abs(p.y - it.start.y),
        };
        setMarquee(rect);
        const index = byId(elementsRef.current);
        const hits = elementsRef.current.filter(el => {
          if (el.parentId || el.hidden) return false;
          const a = absolutePosition(el, index);
          return a.x < rect.x + rect.w && a.x + el.w > rect.x && a.y < rect.y + rect.h && a.y + el.h > rect.y;
        });
        dispatch({ type: 'SET_SELECTION', ids: [...new Set([...it.additive, ...hits.map(h => h.id)])] });
        return;
      }

      const dx = e.clientX - it.startX;
      const dy = e.clientY - it.startY;

      if (it.kind === 'move') {
        if (!it.started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        it.started = true;
        dispatch({
          type: 'UPDATE_ELEMENTS',
          checkpoint: it.key,
          updates: it.origins.map(o => ({
            id: o.id,
            changes: { x: snap(o.x + dx / scale), y: snap(o.y + dy / scale) },
          })),
        });
        return;
      }

      // Resize
      const { origin: o, handle: h } = it;
      let { x, y, w, h: height } = o;
      const sx = dx / scale;
      const sy = dy / scale;
      if (h.includes('e')) w = o.w + sx;
      if (h.includes('s')) height = o.h + sy;
      if (h.includes('w')) w = o.w - sx;
      if (h.includes('n')) height = o.h - sy;
      if (e.shiftKey && h.length === 2) {
        // Keep the proportions from the corners.
        const ratio = o.w / o.h;
        if (Math.abs(w / o.w) > Math.abs(height / o.h)) height = w / ratio;
        else w = height * ratio;
      }
      w = Math.max(MIN_SIZE, snap(w));
      height = Math.max(MIN_SIZE, snap(height));
      if (h.includes('w')) x = o.x + o.w - w;
      if (h.includes('n')) y = o.y + o.h - height;
      dispatch({
        type: 'UPDATE_ELEMENTS',
        checkpoint: it.key,
        updates: [{ id: it.id, changes: { x, y, w, h: height } }],
      });
    };

    const onUp = () => {
      if (!interaction.current) return;
      interaction.current = null;
      setMarquee(null);
      setPanning(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dispatch, snap, toCanvasPoint]);

  const startPan = (e: React.MouseEvent) => {
    interaction.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, pan: { ...stateRef.current.pan } };
    setPanning(true);
  };

  /* ------------------------------ Mouse downs ----------------------------- */

  const onViewportMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
    // Take focus away from panel inputs so keyboard shortcuts work on the canvas.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const additive = e.shiftKey ? stateRef.current.selectedIds : [];
    interaction.current = { kind: 'marquee', start: toCanvasPoint(e.clientX, e.clientY), additive };
    if (!e.shiftKey) dispatch({ type: 'SET_SELECTION', ids: [] });
  };

  /**
   * A click selects the outermost group, like in design tools. Once inside a group
   * (a sibling is selected), clicks select at that depth.
   */
  const pickTarget = useCallback((el: CanvasElement) => {
    const index = byId(elementsRef.current);
    const chain = [el, ...ancestors(el, index)].reverse();
    const selectedParents = new Set(
      stateRef.current.selectedIds.map(id => index.get(id)?.parentId).filter(Boolean),
    );
    return chain.find(node => node.parentId && selectedParents.has(node.parentId)) ?? chain[0];
  }, []);

  const onElementMouseDown = useCallback((e: React.MouseEvent, el: CanvasElement) => {
    if (e.button === 1 || (e.button === 0 && spaceDown)) return; // Let the viewport pan.
    if (e.button !== 0) return;
    e.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur?.();

    const target = pickTarget(el);
    const { selectedIds } = stateRef.current;
    if (e.shiftKey) {
      dispatch({ type: 'TOGGLE_SELECTION', id: target.id });
      return;
    }
    const selection = selectedIds.includes(target.id) ? selectedIds : [target.id];
    if (selection !== selectedIds) dispatch({ type: 'SET_SELECTION', ids: selection });

    const index = byId(elementsRef.current);
    const movable = selectionRoots(selection, elementsRef.current).filter(r => !isLocked(r, index));
    if (!movable.length) return;
    interaction.current = {
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      origins: movable.map(r => ({ id: r.id, x: r.x, y: r.y })),
      started: false,
      key: `drag:${++interactionCounter}`,
    };
  }, [dispatch, pickTarget, spaceDown]);

  // Double-click enters a group and selects the element under the pointer.
  const onElementDoubleClick = useCallback((e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    const target = pickTarget(el);
    if (target.id === el.id) return;
    const index = byId(elementsRef.current);
    const chain = [el, ...ancestors(el, index)];
    const next = chain[chain.findIndex(n => n.id === target.id) - 1] ?? el;
    dispatch({ type: 'SET_SELECTION', ids: [next.id] });
  }, [dispatch, pickTarget]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent, el: CanvasElement, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLocked(el, byId(elementsRef.current))) return;
    interaction.current = {
      kind: 'resize',
      id: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: el.x, y: el.y, w: el.w, h: el.h },
      key: `resize:${++interactionCounter}`,
    };
  }, []);

  /* ------------------------------ Drag and drop --------------------------- */

  const readDragType = (e: React.DragEvent): ElementType | null => {
    const type = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData('elementType');
    return type && type in ELEMENT_LABELS ? (type as ElementType) : null;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const type = readDragType(e);
    if (type) addElementAt(type, e.clientX, e.clientY);
  };

  /* -------------------------------- Render -------------------------------- */

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CanvasElement[]>();
    for (const el of currentPageElements) {
      if (!el.parentId || el.hidden) continue;
      map.set(el.parentId, [...(map.get(el.parentId) ?? []), el]);
    }
    map.forEach(list => list.sort((a, b) => a.zIndex - b.zIndex));
    return map;
  }, [currentPageElements]);

  const roots = useMemo(
    () => currentPageElements.filter(el => !el.parentId && !el.hidden).sort((a, b) => a.zIndex - b.zIndex),
    [currentPageElements],
  );
  const selectedSet = useMemo(() => new Set(state.selectedIds), [state.selectedIds]);

  const bg = currentPage.canvasBackground;
  const { pan, scale } = state;
  const dot = state.gridSize * 4 * scale;

  return (
    <div
      ref={viewportRef}
      id="wireframe-canvas-container"
      className="relative flex-1 overflow-hidden select-none"
      style={{
        background: bg,
        backgroundImage: state.showGrid ? `radial-gradient(circle, ${dotColor(bg)} 1px, transparent 1px)` : 'none',
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: panning ? 'grabbing' : spaceDown ? 'grab' : 'default',
        overscrollBehavior: 'none',
        boxShadow: dropActive ? 'inset 0 0 0 2px #4f8ef7' : undefined,
      }}
      onMouseDown={onViewportMouseDown}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDragEnter={() => setDropActive(true)}
      onDragLeave={e => { if (e.currentTarget === e.target) setDropActive(false); }}
      onDrop={onDrop}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        id="wireframe-canvas"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        {roots.map(el => (
          <WireframeElement
            key={el.id}
            element={el}
            childrenByParent={childrenByParent}
            selectedIds={selectedSet}
            scale={scale}
            onMouseDown={onElementMouseDown}
            onDoubleClick={onElementDoubleClick}
            onResizeMouseDown={onResizeMouseDown}
          />
        ))}
        {marquee && (
          <div
            style={{
              position: 'absolute',
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
              border: `${1.5 / scale}px dashed #4f8ef7`,
              background: 'rgba(79,142,247,0.08)',
              pointerEvents: 'none',
              zIndex: 100000,
            }}
          />
        )}
      </div>

      {roots.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center" style={{ color: dotColor(bg).replace('0.18', '0.45') }}>
            <MousePointerClick size={28} />
            <div className="text-sm">Drag a component here, or click one in the library</div>
            <div className="text-xs">Scroll to pan · Ctrl + scroll to zoom · Space + drag to move around</div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-3 left-3 rounded px-2 py-1 text-xs"
        style={{ background: 'rgba(0,0,0,0.6)', color: '#aaa' }}
      >
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
