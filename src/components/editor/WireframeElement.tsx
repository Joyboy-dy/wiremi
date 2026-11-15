import React from 'react';
import type { CanvasElement } from '../../types/editor';

const HANDLE_SIZE = 8;

interface HandleProps {
  pos: string;
  scale: number;
  onMouseDown: (e: React.MouseEvent, handle: string) => void;
}
function ResizeHandle({ pos, scale, onMouseDown }: HandleProps) {
  // Handles keep the same size on screen whatever the zoom.
  const size = HANDLE_SIZE / scale;
  const o = -size / 2;
  const styles: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    background: '#fff',
    border: `${1.5 / scale}px solid #4f8ef7`,
    borderRadius: 2 / scale,
    zIndex: 100000,
    boxSizing: 'border-box',
  };
  const posMap: Record<string, React.CSSProperties> = {
    nw: { top: o, left: o, cursor: 'nwse-resize' },
    n:  { top: o, left: `calc(50% + ${o}px)`, cursor: 'ns-resize' },
    ne: { top: o, right: o, cursor: 'nesw-resize' },
    e:  { top: `calc(50% + ${o}px)`, right: o, cursor: 'ew-resize' },
    se: { bottom: o, right: o, cursor: 'nwse-resize' },
    s:  { bottom: o, left: `calc(50% + ${o}px)`, cursor: 'ns-resize' },
    sw: { bottom: o, left: o, cursor: 'nesw-resize' },
    w:  { top: `calc(50% + ${o}px)`, left: o, cursor: 'ew-resize' },
  };
  return (
    <div
      data-export-ignore
      style={{ ...styles, ...posMap[pos] }}
      onMouseDown={e => { e.stopPropagation(); onMouseDown(e, pos); }}
    />
  );
}

// Wireframe renderers per type
function renderContent(el: CanvasElement) {
  const { type, props } = el;
  const label = props.label || el.label;

  const baseText: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    color: '#555',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  switch (type) {
    case 'frame':
    case 'group':
      return (
        <div style={{ position: 'absolute', top: -18, left: 0, ...baseText, fontSize: 10, color: '#888' }}>
          {label}
        </div>
      );
    case 'card':
      return <div style={{ ...baseText, padding: '6px 8px' }}>{label}</div>;
    case 'section':
      return <div style={{ ...baseText, padding: '4px 8px', opacity: 0.6 }}>Section</div>;
    case 'row':
      return <div style={{ ...baseText, padding: '4px 8px', opacity: 0.6 }}>Row</div>;
    case 'column':
      return <div style={{ ...baseText, padding: '4px 8px', opacity: 0.6, writingMode: 'vertical-lr' }}>Column</div>;
    case 'navbar':
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 12px', gap: 16 }}>
          <div style={{ ...baseText, fontWeight: 700, fontSize: 13 }}>Logo</div>
          {['Home', 'About', 'Contact'].map(t => (
            <div key={t} style={{ ...baseText, fontSize: 11 }}>{t}</div>
          ))}
          <div style={{ marginLeft: 'auto', ...baseText, background: '#ddd', padding: '3px 10px', borderRadius: 3 }}>CTA</div>
        </div>
      );
    case 'sidebar-nav':
      return (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Dashboard', 'Settings', 'Profile', 'Analytics'].map(t => (
            <div key={t} style={{ ...baseText, padding: '5px 8px', background: t === 'Dashboard' ? '#e0e0e0' : 'transparent', borderRadius: 3 }}>{t}</div>
          ))}
        </div>
      );
    case 'breadcrumb':
      return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 8px', gap: 6 }}>
          {['Home', '/', 'Section', '/', 'Page'].map((t, i) => (
            <span key={i} style={{ ...baseText, opacity: t === '/' ? 0.4 : 1 }}>{t}</span>
          ))}
        </div>
      );
    case 'header':
      return (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ ...baseText, fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#333' }}>Hero Title</div>
          <div style={{ ...baseText, fontSize: 12, color: '#666', marginBottom: 10 }}>Subtitle placeholder text goes here</div>
          <div style={{ display: 'inline-block', ...baseText, background: '#ccc', padding: '4px 14px', borderRadius: 3 }}>CTA Button</div>
        </div>
      );
    case 'text':
      return (
        <div style={{ ...baseText, padding: '6px 8px', fontSize: 12, lineHeight: 1.6, color: '#444' }}>
          {props.text || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.'}
        </div>
      );
    case 'image':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="#ccc" strokeWidth="1.5" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="#ccc" strokeWidth="1.5" />
          </svg>
          <div style={{ ...baseText, position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#999' }}>Image</div>
        </div>
      );
    case 'background':
      return <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.04) 8px, rgba(0,0,0,0.04) 16px)' }} />;
    case 'divider':
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', height: 1, background: '#ccc' }} />
      </div>;
    case 'spacer':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...baseText, color: '#ccc', fontSize: 10 }}>spacer</div>
        </div>
      );
    case 'button':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ddd', borderRadius: 4 }}>
          <span style={{ ...baseText, color: '#333' }}>{props.text || 'Button'}</span>
        </div>
      );
    case 'input':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', padding: '0 6px', borderBottom: '2px solid #bbb' }}>
          <span style={{ ...baseText, color: '#bbb', marginBottom: 4 }}>{props.placeholder || 'Placeholder...'}</span>
        </div>
      );
    case 'checkbox':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
          <div style={{ width: 14, height: 14, border: '1.5px solid #999', borderRadius: 2, background: '#fff' }} />
          <span style={{ ...baseText }}>{props.label || 'Option'}</span>
        </div>
      );
    case 'radio':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
          <div style={{ width: 14, height: 14, border: '1.5px solid #999', borderRadius: '50%', background: '#fff' }} />
          <span style={{ ...baseText }}>{props.label || 'Option'}</span>
        </div>
      );
    case 'toggle':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
          <div style={{ width: 32, height: 16, background: '#ccc', borderRadius: 8, position: 'relative' }}>
            <div style={{ position: 'absolute', width: 12, height: 12, background: '#fff', borderRadius: '50%', top: 2, left: 2 }} />
          </div>
        </div>
      );
    case 'badge':
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: '#ddd', borderRadius: 12 }}>
          <span style={{ ...baseText, fontSize: 10 }}>{props.label || 'Badge'}</span>
        </div>
      );
    case 'avatar':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ddd', borderRadius: '50%' }}>
          <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
      );
    case 'icon':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
            <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
          </svg>
        </div>
      );
    case 'table': {
      const cols = props.columns || 3;
      const rows = props.rows || 4;
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ background: '#e8e8e8' }}>
                {Array.from({ length: cols }).map((_, i) => <th key={i} style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'left', color: '#555' }}>Col {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: cols }).map((_, c) => <td key={c} style={{ border: '1px solid #ddd', padding: '3px 6px', color: '#aaa' }}>—</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'list':
      return (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />
              <div style={{ ...baseText, color: '#888' }}>List item {i}</div>
            </div>
          ))}
        </div>
      );
    case 'card-grid':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 8, height: '100%' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#ebebeb', border: '1px solid #ddd', borderRadius: 4, padding: 6 }}>
              <div style={{ ...baseText, fontWeight: 600, marginBottom: 4, color: '#666' }}>Card {i}</div>
              <div style={{ width: '100%', height: 40, background: '#ddd', borderRadius: 2 }} />
            </div>
          ))}
        </div>
      );
    case 'chart':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', padding: 8 }}>
          <div style={{ ...baseText, marginBottom: 4, color: '#888' }}>Chart</div>
          <svg width="100%" height="calc(100% - 20px)">
            {[0.7, 0.4, 0.9, 0.5, 0.8, 0.3, 0.6].map((v, i, arr) => {
              const bw = 100 / arr.length;
              return (
                <rect key={i} x={`${i * bw + 2}%`} y={`${(1 - v) * 100}%`} width={`${bw - 4}%`} height={`${v * 100}%`} fill="#ccc" rx="2" />
              );
            })}
          </svg>
        </div>
      );
    case 'modal':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...baseText, fontWeight: 600, color: '#333' }}>Dialog Title</span>
            <span style={{ ...baseText, color: '#aaa', fontSize: 14 }}>✕</span>
          </div>
          <div style={{ flex: 1, padding: '8px 12px' }}>
            <div style={{ ...baseText, color: '#888', fontSize: 11 }}>Modal body content placeholder</div>
          </div>
          <div style={{ padding: '6px 12px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <div style={{ ...baseText, background: '#e8e8e8', padding: '4px 10px', borderRadius: 3 }}>Cancel</div>
            <div style={{ ...baseText, background: '#ccc', padding: '4px 10px', borderRadius: 3 }}>Confirm</div>
          </div>
        </div>
      );
    case 'tooltip':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ ...baseText, background: '#333', color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 10 }}>
            Tooltip text
          </div>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #333', marginLeft: 10 }} />
        </div>
      );
    case 'dropdown':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 4 }}>
          {['Option 1', 'Option 2', 'Option 3'].map(opt => (
            <div key={opt} style={{ ...baseText, padding: '4px 8px', borderRadius: 3, color: '#555', background: 'transparent' }}>{opt}</div>
          ))}
        </div>
      );
    default:
      return <div style={{ ...baseText, padding: 8 }}>{label}</div>;
  }
}

const CONTAINERS = new Set(['frame', 'card', 'section', 'row', 'column', 'group', 'modal']);
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

interface Props {
  element: CanvasElement;
  childrenByParent: Map<string, CanvasElement[]>;
  selectedIds: Set<string>;
  scale: number;
  onMouseDown: (e: React.MouseEvent, el: CanvasElement) => void;
  onDoubleClick: (e: React.MouseEvent, el: CanvasElement) => void;
  onResizeMouseDown: (e: React.MouseEvent, el: CanvasElement, handle: string) => void;
}

function WireframeElement({ element, childrenByParent, selectedIds, scale, onMouseDown, onDoubleClick, onResizeMouseDown }: Props) {
  const isContainer = CONTAINERS.has(element.type);
  const isSelected = selectedIds.has(element.id);
  const children = childrenByParent.get(element.id) ?? [];

  const borderStyle = (): React.CSSProperties => {
    switch (element.type) {
      case 'frame': return { border: '2px solid #aaa', borderRadius: element.borderRadius };
      case 'group': return { border: '2px dashed #bbb', borderRadius: element.borderRadius };
      case 'card': return { border: '1px solid #ccc', borderRadius: element.borderRadius || 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
      case 'section': return { border: '1px dashed #ccc' };
      case 'row': return { border: '1px dashed #ccc', borderRadius: element.borderRadius };
      case 'column': return { border: '1px dashed #ccc', borderRadius: element.borderRadius };
      case 'navbar': return { border: '1px solid #ddd', borderRadius: element.borderRadius };
      case 'sidebar-nav': return { border: '1px solid #ddd', borderRadius: element.borderRadius };
      case 'modal': return { border: '1px solid #ccc', borderRadius: element.borderRadius || 6, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' };
      case 'tooltip': return { border: 'none' };
      case 'dropdown': return { border: '1px solid #ddd', borderRadius: element.borderRadius || 4, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' };
      default: return { border: '1px solid #ddd', borderRadius: element.borderRadius };
    }
  };

  const bgColor = (): string => {
    switch (element.type) {
      case 'frame': return '#ffffff';
      case 'group': return 'transparent';
      case 'card': return '#ffffff';
      case 'section': return '#f5f5f5';
      case 'row': return 'rgba(200,200,200,0.1)';
      case 'column': return 'rgba(200,200,200,0.1)';
      case 'navbar': return '#f0f0f0';
      case 'sidebar-nav': return '#f4f4f4';
      case 'background': return '#e8e8e8';
      case 'modal': return '#ffffff';
      case 'dropdown': return '#ffffff';
      case 'avatar': return 'transparent';
      default: return '#f9f9f9';
    }
  };

  return (
    <div
      data-element-id={element.id}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        zIndex: element.zIndex,
        opacity: element.opacity,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        // Kept the same thickness at any zoom level.
        outline: isSelected ? `${2 / scale}px solid #4f8ef7` : 'none',
        outlineOffset: 1 / scale,
        background: element.style?.backgroundColor || bgColor(),
        ...borderStyle(),
        cursor: element.locked ? 'default' : 'move',
        overflow: isContainer || element.type === 'avatar' ? 'visible' : 'hidden',
        boxSizing: 'border-box',
      }}
      onMouseDown={e => onMouseDown(e, element)}
      onDoubleClick={e => onDoubleClick(e, element)}
    >
      {renderContent(element)}

      {children.map(child => (
        <WireframeElement
          key={child.id}
          element={child}
          childrenByParent={childrenByParent}
          selectedIds={selectedIds}
          scale={scale}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          onResizeMouseDown={onResizeMouseDown}
        />
      ))}

      {isSelected && !element.locked &&
        HANDLES.map(h => (
          <ResizeHandle
            key={h}
            pos={h}
            scale={scale}
            onMouseDown={(e, handle) => onResizeMouseDown(e, element, handle)}
          />
        ))}
    </div>
  );
}

export default React.memo(WireframeElement);
