import { useEffect, useRef } from 'react';
import { useEditor } from '../contexts/EditorContext';

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl Z', action: 'Undo' },
  { keys: 'Ctrl Shift Z / Ctrl Y', action: 'Redo' },
  { keys: 'Ctrl C / X / V', action: 'Copy, cut, paste' },
  { keys: 'Ctrl D', action: 'Duplicate' },
  { keys: 'Ctrl G', action: 'Group' },
  { keys: 'Ctrl Shift G', action: 'Ungroup' },
  { keys: 'Ctrl A', action: 'Select all' },
  { keys: 'Delete', action: 'Delete selection' },
  { keys: 'Arrows (+ Shift)', action: 'Nudge 1 px (10 px)' },
  { keys: ']  /  [', action: 'Bring forward / send backward' },
  { keys: 'Ctrl ]  /  Ctrl [', action: 'Bring to front / send to back' },
  { keys: 'Ctrl + / Ctrl -', action: 'Zoom in / out' },
  { keys: 'Shift 1', action: 'Zoom to fit' },
  { keys: 'Ctrl 0', action: 'Reset zoom' },
  { keys: 'Space + drag', action: 'Pan the canvas' },
  { keys: 'Double-click', action: 'Select inside a group' },
  { keys: 'Esc', action: 'Clear selection' },
  { keys: '?', action: 'Show shortcuts' },
];

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function useKeyboardShortcuts(onShowHelp: () => void) {
  const editor = useEditor();
  const ref = useRef(editor);
  ref.current = editor;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      // Leave keys alone while a dialog or menu is open.
      // (Closing animations leave them in the page for a moment with data-state="closed".)
      if (document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]',
      )) return;

      const { dispatch, state, copySelection, cutSelection, pasteClipboard, zoomBy, zoomToFit, resetView } = ref.current;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };

      if (ctrl) {
        if (key === 'z') return run(() => dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' }));
        if (key === 'y') return run(() => dispatch({ type: 'REDO' }));
        if (key === 'a') return run(() => dispatch({ type: 'SELECT_ALL' }));
        if (key === 'c') return run(copySelection);
        if (key === 'x') return run(cutSelection);
        if (key === 'v') return run(pasteClipboard);
        if (key === 'd') return run(() => dispatch({ type: 'DUPLICATE_SELECTED' }));
        if (key === 'g') return run(() => dispatch({ type: e.shiftKey ? 'UNGROUP_SELECTED' : 'GROUP_SELECTED' }));
        if (key === ']') return run(() => dispatch({ type: 'REORDER_SELECTED', move: 'front' }));
        if (key === '[') return run(() => dispatch({ type: 'REORDER_SELECTED', move: 'back' }));
        if (key === '=' || key === '+') return run(() => zoomBy(1.2));
        if (key === '-') return run(() => zoomBy(1 / 1.2));
        if (key === '0') return run(resetView);
        return;
      }

      if (e.altKey) return;
      if (key === 'delete' || key === 'backspace') return run(() => dispatch({ type: 'DELETE_SELECTED' }));
      if (key === 'escape') return dispatch({ type: 'SET_SELECTION', ids: [] });
      if (key === ']') return run(() => dispatch({ type: 'REORDER_SELECTED', move: 'forward' }));
      if (key === '[') return run(() => dispatch({ type: 'REORDER_SELECTED', move: 'backward' }));
      if (e.key === '?') return run(onShowHelp);
      if (e.shiftKey && (e.code === 'Digit1' || key === '!')) return run(zoomToFit);

      const step = e.shiftKey ? 10 : 1;
      const arrows: Record<string, [number, number]> = {
        arrowleft: [-step, 0],
        arrowright: [step, 0],
        arrowup: [0, -step],
        arrowdown: [0, step],
      };
      if (arrows[key] && state.selectedIds.length) {
        const [dx, dy] = arrows[key];
        run(() => dispatch({ type: 'NUDGE_SELECTED', dx, dy }));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onShowHelp]);
}
