import type { CanvasElement, ElementType } from '../types/editor';
import { DEFAULT_ELEMENT_SIZES, ELEMENT_LABELS } from '../types/editor';

export const newId = () => crypto.randomUUID();

export function createElement(
  type: ElementType,
  x: number,
  y: number,
  pageId: string,
  zIndex: number,
): CanvasElement {
  const size = DEFAULT_ELEMENT_SIZES[type] ?? { w: 120, h: 80 };
  return {
    id: newId(),
    type,
    label: ELEMENT_LABELS[type] ?? type,
    x: Math.round(x),
    y: Math.round(y),
    w: size.w,
    h: size.h,
    zIndex,
    parentId: null,
    pageId,
    opacity: 1,
    borderRadius: 0,
    rotation: 0,
    locked: false,
    hidden: false,
    props: {},
  };
}

export const byId = (elements: CanvasElement[]) => new Map(elements.map(e => [e.id, e]));

export function ancestors(el: CanvasElement, index: Map<string, CanvasElement>): CanvasElement[] {
  const chain: CanvasElement[] = [];
  let parent = el.parentId ? index.get(el.parentId) : undefined;
  while (parent && !chain.includes(parent)) {
    chain.push(parent);
    parent = parent.parentId ? index.get(parent.parentId) : undefined;
  }
  return chain;
}

/** An element is locked when it, or any group containing it, is locked. */
export function isLocked(el: CanvasElement, index: Map<string, CanvasElement>): boolean {
  return el.locked || ancestors(el, index).some(a => a.locked);
}

export function isHidden(el: CanvasElement, index: Map<string, CanvasElement>): boolean {
  return el.hidden || ancestors(el, index).some(a => a.hidden);
}

/** Top-left corner on the page, adding up the offsets of every parent. */
export function absolutePosition(el: CanvasElement, index: Map<string, CanvasElement>) {
  return ancestors(el, index).reduce(
    (pos, parent) => ({ x: pos.x + parent.x, y: pos.y + parent.y }),
    { x: el.x, y: el.y },
  );
}

/** Ids of the given elements and of everything nested inside them. */
export function subtreeIds(ids: Iterable<string>, elements: CanvasElement[]): Set<string> {
  const result = new Set<string>();
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const el of elements) if (el.parentId === id) stack.push(el.id);
  }
  return result;
}

/** Selected elements whose parent is not selected too: the ones an operation acts on. */
export function selectionRoots(selectedIds: string[], elements: CanvasElement[]): CanvasElement[] {
  const index = byId(elements);
  const selected = new Set(selectedIds);
  return selectedIds
    .map(id => index.get(id))
    .filter((el): el is CanvasElement => !!el && !ancestors(el, index).some(a => selected.has(a.id)));
}

export function siblingsOf(el: Pick<CanvasElement, 'parentId' | 'pageId'>, elements: CanvasElement[]) {
  return elements.filter(e => e.pageId === el.pageId && e.parentId === el.parentId);
}

export function topZ(parentId: string | null, pageId: string, elements: CanvasElement[]): number {
  const siblings = siblingsOf({ parentId, pageId }, elements);
  return siblings.length ? Math.max(...siblings.map(e => e.zIndex)) : 0;
}

/**
 * Deep-copies elements with their descendants under fresh ids.
 * Roots keep their own parent unless `rootParentId` is given.
 */
export function cloneSubtrees(
  rootIds: string[],
  elements: CanvasElement[],
  overrides: (root: CanvasElement) => Partial<CanvasElement> = () => ({}),
): { clones: CanvasElement[]; rootIds: string[] } {
  const ids = subtreeIds(rootIds, elements);
  const idMap = new Map([...ids].map(id => [id, newId()]));
  const rootSet = new Set(rootIds);
  const clones = elements
    .filter(el => ids.has(el.id))
    .map(el => {
      const copy: CanvasElement = structuredClone(el);
      copy.id = idMap.get(el.id)!;
      if (rootSet.has(el.id)) return { ...copy, ...overrides(el) };
      copy.parentId = el.parentId ? (idMap.get(el.parentId) ?? null) : null;
      return copy;
    });
  return { clones, rootIds: rootIds.map(id => idMap.get(id)!) };
}

export function bounds(els: { x: number; y: number; w: number; h: number }[]) {
  if (!els.length) return null;
  const minX = Math.min(...els.map(e => e.x));
  const minY = Math.min(...els.map(e => e.y));
  const maxX = Math.max(...els.map(e => e.x + e.w));
  const maxY = Math.max(...els.map(e => e.y + e.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Visible elements of a page with page coordinates, for exports and zoom-to-fit. */
export function flattenPage(elements: CanvasElement[]) {
  const index = byId(elements);
  return elements
    .filter(el => !isHidden(el, index))
    .map(el => ({ ...el, ...absolutePosition(el, index) }));
}
