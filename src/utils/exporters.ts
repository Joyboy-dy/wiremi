import type { CanvasElement, PageMeta } from '../types/editor';
import { bounds, byId, flattenPage, isHidden } from '../lib/elements';

export const EXPORT_FORMAT_VERSION = '1.1';

export interface WireExport {
  app: 'wiremi';
  version: string;
  projectName: string;
  pages: PageMeta[];
  elements: CanvasElement[];
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A file name every operating system accepts. */
export function safeFileName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 80) || 'wireframe';
}

const displayText = (el: CanvasElement) => el.props.text || el.props.label || el.label;

/* ---------------------------------- JSON ---------------------------------- */

export function toWireJSON(projectName: string, pages: PageMeta[], elements: CanvasElement[]): string {
  const data: WireExport = { app: 'wiremi', version: EXPORT_FORMAT_VERSION, projectName, pages, elements };
  return JSON.stringify(data, null, 2);
}

/** Reads a file exported by Wiremi, including the first format with elements only. */
export function parseWireJSON(text: string): { projectName: string; pages: PageMeta[]; elements: CanvasElement[] } {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.elements)) throw new Error('This file is not a Wiremi export.');
  const elements = (data.elements as CanvasElement[]).filter(
    el => el && typeof el.id === 'string' && typeof el.type === 'string',
  );
  const pages: PageMeta[] = Array.isArray(data.pages) && data.pages.length ? data.pages : [];
  return { projectName: String(data.projectName || 'Imported project'), pages, elements };
}

/* ---------------------------------- HTML ---------------------------------- */

const TAGS: Record<string, string> = {
  button: 'button', navbar: 'nav', 'sidebar-nav': 'aside', section: 'section',
  header: 'header', modal: 'dialog', image: 'figure', list: 'ul', table: 'table', breadcrumb: 'nav',
};

function elementToHTML(el: CanvasElement, children: Map<string, CanvasElement[]>, depth: number): string {
  const pad = '  '.repeat(depth);
  const style = [
    `left:${el.x}px`, `top:${el.y}px`, `width:${el.w}px`, `height:${el.h}px`, `z-index:${el.zIndex}`,
    el.opacity !== 1 && `opacity:${el.opacity}`,
    el.borderRadius && `border-radius:${el.borderRadius}px`,
    el.style?.backgroundColor && `background:${el.style.backgroundColor}`,
  ].filter(Boolean).join(';');
  const attrs = `class="wire wire-${el.type}" style="${style}" data-label="${escapeXml(el.label)}"`;

  if (el.type === 'divider') return `${pad}<hr ${attrs} />`;
  if (el.type === 'input') {
    return `${pad}<input ${attrs} type="text" placeholder="${escapeXml(el.props.placeholder || '')}" />`;
  }
  const tag = el.type === 'modal' ? 'div' : TAGS[el.type] || 'div';
  const inner = (children.get(el.id) ?? []).map(c => elementToHTML(c, children, depth + 1));
  const text = escapeXml(displayText(el));
  if (!inner.length) return `${pad}<${tag} ${attrs}>${text}</${tag}>`;
  return [`${pad}<${tag} ${attrs}>`, `${pad}  <span class="wire-label">${text}</span>`, ...inner, `${pad}</${tag}>`].join('\n');
}

export function toHTML(projectName: string, pageName: string, elements: CanvasElement[]): string {
  const index = byId(elements);
  const visible = elements.filter(el => !isHidden(el, index));
  const children = new Map<string, CanvasElement[]>();
  for (const el of visible) {
    if (!el.parentId) continue;
    children.set(el.parentId, [...(children.get(el.parentId) ?? []), el]);
  }
  const roots = visible.filter(el => !el.parentId);
  const box = bounds(flattenPage(elements)) ?? { x: 0, y: 0, w: 800, h: 600 };
  const title = escapeXml(`${projectName} — ${pageName}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f8f8f8; }
    .canvas { position: relative; width: ${box.x + box.w + 40}px; height: ${box.y + box.h + 40}px; }
    .wire { position: absolute; box-sizing: border-box; margin: 0; padding: 6px 8px; overflow: hidden;
            border: 1px solid #ccc; background: #f4f4f4; font-size: 12px; color: #555; list-style: none; }
    .wire-group { border-style: dashed; background: transparent; overflow: visible; }
    .wire-frame, .wire-card, .wire-modal { background: #fff; overflow: visible; }
    .wire-divider { padding: 0; border: none; border-top: 1px solid #ccc; background: none; }
    .wire-button { background: #ddd; border-radius: 4px; font: inherit; }
    .wire-label { font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <div class="canvas">
${roots.map(el => elementToHTML(el, children, 2)).join('\n')}
  </div>
</body>
</html>`;
}

/* ----------------------------------- SVG ---------------------------------- */

export function toSVG(elements: CanvasElement[], background: string): string {
  const flat = flattenPage(elements);
  const padding = 20;
  const box = bounds(flat) ?? { x: 0, y: 0, w: 800, h: 600 };
  const ox = box.x - padding;
  const oy = box.y - padding;
  const w = box.w + padding * 2;
  const h = box.h + padding * 2;
  const depth = (el: CanvasElement) => {
    let d = 0;
    let parentId = el.parentId;
    const index = byId(elements);
    while (parentId) {
      d++;
      parentId = index.get(parentId)?.parentId ?? null;
    }
    return d;
  };
  // Parents first, then children, each level in stacking order.
  const ordered = [...flat].sort((a, b) => depth(a) - depth(b) || a.zIndex - b.zIndex);
  const shapes = ordered
    .map(el => {
      const dashed = el.type === 'group' ? ' stroke-dasharray="6 4"' : '';
      const fill = el.type === 'group' ? 'none' : el.style?.backgroundColor || '#f4f4f4';
      return `  <g opacity="${el.opacity}">
    <rect x="${el.x - ox}" y="${el.y - oy}" width="${el.w}" height="${el.h}" rx="${el.borderRadius}" fill="${fill}" stroke="#bbb"${dashed} />
    <text x="${el.x - ox + 6}" y="${el.y - oy + 16}" font-family="ui-monospace, monospace" font-size="11" fill="#666">${escapeXml(displayText(el))}</text>
  </g>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${escapeXml(background)}" />
${shapes}
</svg>`;
}

/* ----------------------------------- PNG ---------------------------------- */

/**
 * Renders the live canvas DOM at 100% zoom, cropped to the page content.
 * The canvas is cloned so the user's view, selection and handles stay untouched.
 */
export async function toPNG(canvas: HTMLElement, elements: CanvasElement[], background: string): Promise<Blob> {
  const box = bounds(flattenPage(elements));
  if (!box) throw new Error('This page is empty.');
  const padding = 40;
  const { default: html2canvas } = await import('html2canvas');

  const stage = document.createElement('div');
  stage.style.cssText = `position:fixed;left:-100000px;top:0;width:${box.w + padding * 2}px;height:${box.h + padding * 2}px;overflow:hidden;background:${background};`;
  const clone = canvas.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.style.transform = `translate(${padding - box.x}px, ${padding - box.y}px)`;
  clone.querySelectorAll('[data-export-ignore]').forEach(n => n.remove());
  clone.querySelectorAll<HTMLElement>('[data-element-id]').forEach(n => (n.style.outline = 'none'));
  stage.appendChild(clone);
  document.body.appendChild(stage);
  try {
    const rendered = await html2canvas(stage, { backgroundColor: background, scale: 2, logging: false });
    return await new Promise<Blob>((resolve, reject) =>
      rendered.toBlob(blob => (blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))), 'image/png'),
    );
  } finally {
    stage.remove();
  }
}

/* -------------------------------- AI prompt ------------------------------- */

const formatType = (type: string) =>
  type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function toAIPrompt(projectName: string, pageName: string, elements: CanvasElement[]): string {
  const index = byId(elements);
  const visible = elements.filter(el => !isHidden(el, index));
  if (!visible.length) return 'This page is empty: add components to the canvas first.';
  const flat = new Map(flattenPage(elements).map(e => [e.id, e]));
  const box = bounds([...flat.values()])!;
  const childrenOf = (id: string) => visible.filter(e => e.parentId === id).sort((a, b) => a.y - b.y || a.x - b.x);

  const describe = (el: CanvasElement, depth: number): string => {
    const pad = '  '.repeat(depth);
    const pos = flat.get(el.id)!;
    const lines = [`${pad}- ${el.label} (${formatType(el.type)}) — ${el.w}×${el.h}px at (${Math.round(pos.x - box.x)}, ${Math.round(pos.y - box.y)})`];
    if (el.props.text) lines.push(`${pad}  Text: "${el.props.text}"`);
    if (el.props.label && el.props.label !== el.label) lines.push(`${pad}  Label: "${el.props.label}"`);
    if (el.props.placeholder) lines.push(`${pad}  Placeholder: "${el.props.placeholder}"`);
    if (el.type === 'table') lines.push(`${pad}  ${el.props.columns || 3} columns × ${el.props.rows || 4} rows`);
    for (const child of childrenOf(el.id)) lines.push(describe(child, depth + 1));
    return lines.join('\n');
  };

  const roots = visible.filter(el => !el.parentId).sort((a, b) => a.y - b.y || a.x - b.x);
  const fullWidth = roots.filter(e => e.w >= box.w * 0.9).map(e => e.label);

  return [
    `Build the "${pageName}" screen of "${projectName}" from this wireframe.`,
    '',
    '## Layout',
    `- Canvas: about ${Math.round(box.w)}×${Math.round(box.h)}px, ${visible.length} components.`,
    fullWidth.length ? `- Full-width blocks: ${fullWidth.join(', ')}.` : '',
    '- Positions are relative to the top-left corner of the layout; nested items belong to the block above them.',
    '',
    '## Components (top to bottom)',
    roots.map(r => describe(r, 0)).join('\n'),
    '',
    '## Notes',
    '- Use semantic HTML that matches each component type.',
    '- Keep the proportions and the order, and make the layout responsive.',
    '- Replace placeholders with realistic content.',
  ].filter(line => line !== '').join('\n').replace(/\n## /g, '\n\n## ');
}

/* --------------------------------- Download ------------------------------- */

export function download(name: string, content: string | Blob, mime = 'application/octet-stream') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
