import { describe, expect, it } from 'vitest';
import type { CanvasElement, EditorState } from '../types/editor';
import { createEditorState, editorReducer, type Action } from './editorReducer';

const run = (state: EditorState, ...actions: Action[]) => actions.reduce(editorReducer, state);

function withElements(...specs: Partial<CanvasElement>[]) {
  let state = createEditorState(null, 'p1');
  for (const spec of specs) {
    state = editorReducer(state, { type: 'ADD_ELEMENT', elementType: spec.type ?? 'card', x: spec.x ?? 0, y: spec.y ?? 0 });
    const id = state.selectedIds[0];
    if (Object.keys(spec).length) {
      state = editorReducer(state, { type: 'UPDATE_ELEMENTS', updates: [{ id, changes: spec }] });
    }
  }
  return { ...state, past: [], future: [] };
}

const ids = (state: EditorState) => state.elements.map(e => e.id);
const get = (state: EditorState, id: string) => state.elements.find(e => e.id === id)!;

describe('history', () => {
  it('undoes a move instead of the previous addition', () => {
    let s = withElements({ x: 0 }, { x: 100 });
    const [, b] = ids(s);
    s = run(s, { type: 'UPDATE_ELEMENTS', updates: [{ id: b, changes: { x: 300 } }], checkpoint: 'drag:1' });
    s = run(s, { type: 'UNDO' });
    expect(s.elements).toHaveLength(2);
    expect(get(s, b).x).toBe(100);
    s = run(s, { type: 'REDO' });
    expect(get(s, b).x).toBe(300);
  });

  it('merges a drag into a single undo step', () => {
    let s = withElements({ x: 0 });
    const [a] = ids(s);
    for (const x of [10, 20, 30, 40]) {
      s = run(s, { type: 'UPDATE_ELEMENTS', updates: [{ id: a, changes: { x } }], checkpoint: 'drag:a' });
    }
    expect(s.past).toHaveLength(1);
    expect(get(run(s, { type: 'UNDO' }), a).x).toBe(0);
  });

  it('keeps separate steps for different keys', () => {
    let s = withElements({ x: 0 });
    const [a] = ids(s);
    s = run(
      s,
      { type: 'UPDATE_ELEMENTS', updates: [{ id: a, changes: { x: 5 } }], checkpoint: `prop:${a}:x` },
      { type: 'UPDATE_ELEMENTS', updates: [{ id: a, changes: { y: 5 } }], checkpoint: `prop:${a}:y` },
    );
    expect(s.past).toHaveLength(2);
  });

  it('undoes a page deletion with its elements', () => {
    let s = withElements({ x: 0 });
    s = run(s, { type: 'ADD_PAGE' }, { type: 'ADD_ELEMENT', elementType: 'button', x: 0, y: 0 });
    const page2 = s.currentPageId;
    s = run(s, { type: 'DELETE_PAGE', pageId: page2 });
    expect(s.pages).toHaveLength(1);
    expect(s.elements).toHaveLength(1);
    s = run(s, { type: 'UNDO' });
    expect(s.pages).toHaveLength(2);
    expect(s.elements).toHaveLength(2);
  });
});

describe('groups', () => {
  it('groups, keeps positions on the page, and ungroups back', () => {
    let s = withElements({ x: 100, y: 50 }, { x: 300, y: 200 });
    const [a, b] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a, b] }, { type: 'GROUP_SELECTED' });
    const g = s.selectedIds[0];
    expect(get(s, g)).toMatchObject({ type: 'group', x: 100, y: 50 });
    expect(get(s, a)).toMatchObject({ parentId: g, x: 0, y: 0 });
    expect(get(s, b)).toMatchObject({ parentId: g, x: 200, y: 150 });

    s = run(s, { type: 'UNGROUP_SELECTED' });
    expect(s.elements.some(e => e.id === g)).toBe(false);
    expect(get(s, a)).toMatchObject({ parentId: null, x: 100, y: 50 });
    expect(get(s, b)).toMatchObject({ parentId: null, x: 300, y: 200 });
    expect(s.selectedIds).toEqual([a, b]);
  });

  it('undoes a grouping in one step', () => {
    let s = withElements({ x: 0 }, { x: 50 });
    const [a, b] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a, b] }, { type: 'GROUP_SELECTED' }, { type: 'UNDO' });
    expect(s.elements).toHaveLength(2);
    expect(s.elements.every(e => e.parentId === null)).toBe(true);
  });

  it('deletes a group with its children', () => {
    let s = withElements({ x: 0 }, { x: 50 }, { x: 900 });
    const [a, b] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a, b] }, { type: 'GROUP_SELECTED' }, { type: 'DELETE_SELECTED' });
    expect(s.elements).toHaveLength(1);
  });

  it('duplicates a group with copies of its children', () => {
    let s = withElements({ x: 0 }, { x: 50 });
    const [a, b] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a, b] }, { type: 'GROUP_SELECTED' }, { type: 'DUPLICATE_SELECTED' });
    const copy = s.selectedIds[0];
    expect(s.elements).toHaveLength(6);
    expect(s.elements.filter(e => e.parentId === copy)).toHaveLength(2);
  });
});

describe('locking', () => {
  it('protects locked elements from moves and deletion', () => {
    let s = withElements({ x: 10, locked: true });
    const [a] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a] }, { type: 'NUDGE_SELECTED', dx: 5, dy: 0 }, { type: 'DELETE_SELECTED' });
    expect(get(s, a).x).toBe(10);
    expect(s.elements).toHaveLength(1);
  });
});

describe('layer order', () => {
  it('moves one step forward and to the back', () => {
    let s = withElements({}, {}, {});
    const [a, b, c] = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: [a] }, { type: 'REORDER_SELECTED', move: 'forward' });
    const order = () => [...s.elements].sort((x, y) => x.zIndex - y.zIndex).map(e => e.id);
    expect(order()).toEqual([b, a, c]);
    s = run(s, { type: 'SET_SELECTION', ids: [c] }, { type: 'REORDER_SELECTED', move: 'back' });
    expect(order()).toEqual([c, b, a]);
  });

  it('stacks new elements above the others', () => {
    const s = withElements({}, {}, {});
    expect(s.elements.map(e => e.zIndex)).toEqual([1, 2, 3]);
  });
});

describe('alignment', () => {
  it('aligns left and distributes horizontally', () => {
    let s = withElements({ x: 10, w: 20 }, { x: 100, w: 20 }, { x: 400, w: 20 });
    const all = ids(s);
    s = run(s, { type: 'SET_SELECTION', ids: all }, { type: 'ALIGN_SELECTED', alignment: 'distribute-h' });
    expect(s.elements.map(e => e.x)).toEqual([10, 205, 400]);
    s = run(s, { type: 'ALIGN_SELECTED', alignment: 'left' });
    expect(s.elements.map(e => e.x)).toEqual([10, 10, 10]);
  });
});

describe('clipboard and pages', () => {
  it('pastes copies on the current page', () => {
    let s = withElements({ x: 10, y: 10 });
    const clipboard = [...s.elements];
    s = run(s, { type: 'ADD_PAGE' }, { type: 'PASTE', clipboard, offset: 16 });
    const pasted = get(s, s.selectedIds[0]);
    expect(pasted).toMatchObject({ x: 26, y: 26, pageId: s.currentPageId });
    expect(pasted.id).not.toBe(clipboard[0].id);
  });

  it('duplicates a page with its elements', () => {
    let s = withElements({ x: 0 }, { x: 50 });
    s = run(s, { type: 'DUPLICATE_PAGE', pageId: s.currentPageId });
    expect(s.pages).toHaveLength(2);
    expect(s.elements.filter(e => e.pageId === s.currentPageId)).toHaveLength(2);
  });

  it('does not delete the last page', () => {
    const s = withElements({});
    expect(run(s, { type: 'DELETE_PAGE', pageId: s.currentPageId }).pages).toHaveLength(1);
  });
});

describe('loading', () => {
  it('moves elements of unknown pages to the first page', () => {
    const s = createEditorState({
      pages: [{ id: 'p1', name: 'Home', canvasBackground: '#fff' }],
      elements: [{ id: 'e', pageId: 'gone' } as CanvasElement],
    });
    expect(s.elements[0].pageId).toBe('p1');
  });
});
