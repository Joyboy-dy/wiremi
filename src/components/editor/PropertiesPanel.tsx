import React, { useEffect, useState } from 'react';
import {
  AlignCenter, AlignEndVertical, AlignLeft, AlignRight, AlignStartVertical, AlignCenterVertical,
  ArrowDown, ArrowDownToLine, ArrowLeftRight, ArrowUp, ArrowUpDown, ArrowUpToLine, Copy, Eye, EyeOff,
  Lock, Trash2, Unlock,
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import type { ElementChanges } from '../../contexts/editorReducer';
import type { Alignment, CanvasElement, ElementProps, LayerMove } from '../../types/editor';
import { ELEMENT_LABELS } from '../../types/editor';
import { byId, isLocked } from '../../lib/elements';
import { ToolButton } from './ToolButton';

const fieldClass =
  'w-full min-w-0 rounded border border-white/10 bg-white/[0.07] px-2 py-1 text-xs text-[#ddd] outline-none focus:border-[#4f8ef7] disabled:opacity-40';

/** Number input that lets the user clear it and type freely; it commits valid numbers only. */
function NumField({ label, value, onChange, min, max, step = 1, disabled, suffix, compact }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; disabled?: boolean; suffix?: string; compact?: boolean;
}) {
  const shown = String(Math.round(value * 10) / 10);
  const [draft, setDraft] = useState(shown);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(shown); }, [shown, focused]);

  // While typing, "3" on the way to "320" must not snap the element to the minimum.
  const commit = (text: string, final = false) => {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) return;
    if (!final && min !== undefined && n < min) return;
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    if (next !== value) onChange(next); // No empty undo steps.
  };

  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className={`${compact ? 'w-3' : 'w-[52px]'} shrink-0 text-[11px] text-[#888]`}>{label}</span>
      <span className="relative min-w-0 flex-1">
        <input
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={e => { commit(e.target.value, true); setFocused(false); setDraft(shown); }}
          onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className={fieldClass}
        />
        {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#666]">{suffix}</span>}
      </span>
    </label>
  );
}

function TextField({ label, value, placeholder, onChange, disabled, multiline }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void; disabled?: boolean; multiline?: boolean;
}) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[11px] text-[#888]">{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} disabled={disabled}
          onChange={e => onChange(e.target.value)} className={`${fieldClass} resize-y leading-relaxed`} />
      ) : (
        <input value={value} placeholder={placeholder} disabled={disabled}
          onChange={e => onChange(e.target.value)} className={fieldClass} />
      )}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 border-b border-white/[0.07] pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#666]">
        {title}
      </h3>
      {children}
    </section>
  );
}

const ALIGN: { type: Alignment; icon: React.ReactNode; label: string }[] = [
  { type: 'left', icon: <AlignLeft size={13} />, label: 'Align left' },
  { type: 'center-h', icon: <AlignCenter size={13} />, label: 'Align centres horizontally' },
  { type: 'right', icon: <AlignRight size={13} />, label: 'Align right' },
  { type: 'top', icon: <AlignStartVertical size={13} />, label: 'Align top' },
  { type: 'center-v', icon: <AlignCenterVertical size={13} />, label: 'Align centres vertically' },
  { type: 'bottom', icon: <AlignEndVertical size={13} />, label: 'Align bottom' },
];

const ORDER: { move: LayerMove; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { move: 'front', icon: <ArrowUpToLine size={13} />, label: 'Bring to front', shortcut: 'Ctrl ]' },
  { move: 'forward', icon: <ArrowUp size={13} />, label: 'Bring forward', shortcut: ']' },
  { move: 'backward', icon: <ArrowDown size={13} />, label: 'Send backward', shortcut: '[' },
  { move: 'back', icon: <ArrowDownToLine size={13} />, label: 'Send to back', shortcut: 'Ctrl [' },
];

const TEXT_TYPES = new Set(['button', 'text', 'badge']);
const LABEL_TYPES = new Set(['checkbox', 'radio']);

export default function PropertiesPanel() {
  const { state, dispatch } = useEditor();
  const index = byId(state.elements);
  const selected = state.selectedIds.map(id => index.get(id)).filter((e): e is CanvasElement => !!e);
  const el = selected.length === 1 ? selected[0] : null;
  const locked = el ? isLocked(el, index) : false;
  const lockedByGroup = el ? locked && !el.locked : false;

  const update = (field: string, changes: ElementChanges) => {
    if (!el) return;
    dispatch({ type: 'UPDATE_ELEMENTS', updates: [{ id: el.id, changes }], checkpoint: `prop:${el.id}:${field}` });
  };
  const updateProp = (key: keyof ElementProps, value: unknown) => {
    if (el) update(`props.${key}`, { props: { ...el.props, [key]: value } });
  };
  const toggle = (field: 'locked' | 'hidden') => {
    if (el) dispatch({ type: 'UPDATE_ELEMENTS', updates: [{ id: el.id, changes: { [field]: !el[field] } }] });
  };

  const actions = (
    <>
      <Section title="Layer order">
        <div className="grid grid-cols-4 gap-1">
          {ORDER.map(o => (
            <ToolButton key={o.move} label={o.label} shortcut={o.shortcut} disabled={locked}
              onClick={() => dispatch({ type: 'REORDER_SELECTED', move: o.move })} className="w-full">
              {o.icon}
            </ToolButton>
          ))}
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-1.5">
        <ToolButton label="Duplicate" shortcut="Ctrl D" className="w-full" onClick={() => dispatch({ type: 'DUPLICATE_SELECTED' })}>
          <Copy size={13} /> Duplicate
        </ToolButton>
        <ToolButton label="Delete" shortcut="Del" tone="danger" className="w-full" disabled={locked}
          onClick={() => dispatch({ type: 'DELETE_SELECTED' })}>
          <Trash2 size={13} /> Delete
        </ToolButton>
      </div>
    </>
  );

  if (!selected.length) {
    return (
      <div className="px-4 pt-10 text-center text-xs leading-relaxed text-[#666]">
        Select an element to edit it.
        <br />
        Shift-click or drag a box to select several.
      </div>
    );
  }

  if (!el) {
    return (
      <div className="h-full overflow-y-auto p-3 text-xs">
        <p className="mb-3 text-[#aaa]">{selected.length} elements selected</p>
        <Section title="Align">
          <div className="mb-1 grid grid-cols-6 gap-1">
            {ALIGN.map(a => (
              <ToolButton key={a.type} label={a.label} className="w-full"
                onClick={() => dispatch({ type: 'ALIGN_SELECTED', alignment: a.type })}>
                {a.icon}
              </ToolButton>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <ToolButton label="Distribute horizontally (3 or more)" className="w-full" disabled={selected.length < 3}
              onClick={() => dispatch({ type: 'ALIGN_SELECTED', alignment: 'distribute-h' })}>
              <ArrowLeftRight size={12} /> Distribute
            </ToolButton>
            <ToolButton label="Distribute vertically (3 or more)" className="w-full" disabled={selected.length < 3}
              onClick={() => dispatch({ type: 'ALIGN_SELECTED', alignment: 'distribute-v' })}>
              <ArrowUpDown size={12} /> Distribute
            </ToolButton>
          </div>
        </Section>
        {actions}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 text-xs">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex-1 truncate text-[11px] uppercase tracking-wider text-[#888]">{ELEMENT_LABELS[el.type]}</span>
        <ToolButton label={el.hidden ? 'Show' : 'Hide'} active={el.hidden} onClick={() => toggle('hidden')}>
          {el.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </ToolButton>
        <ToolButton label={el.locked ? 'Unlock' : 'Lock'} active={el.locked} disabled={lockedByGroup} onClick={() => toggle('locked')}>
          {el.locked ? <Lock size={13} /> : <Unlock size={13} />}
        </ToolButton>
      </div>
      {locked && (
        <p className="mb-3 rounded border border-orange-400/30 bg-orange-400/10 px-2 py-1.5 text-[11px] text-orange-300">
          {lockedByGroup ? 'Locked by its group. Unlock the group to edit it.' : 'Locked. Unlock it to move or edit it.'}
        </p>
      )}

      <Section title="Label">
        <input aria-label="Label" value={el.label} disabled={locked} className={fieldClass}
          onChange={e => update('label', { label: e.target.value })}
          onBlur={e => !e.target.value.trim() && update('label', { label: ELEMENT_LABELS[el.type] })} />
      </Section>

      <Section title={el.parentId ? 'Position (in group) & size' : 'Position & size'}>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <NumField compact label="X" value={el.x} disabled={locked} onChange={v => update('x', { x: v })} />
          <NumField compact label="Y" value={el.y} disabled={locked} onChange={v => update('y', { y: v })} />
          <NumField compact label="W" value={el.w} min={8} disabled={locked} onChange={v => update('w', { w: v })} />
          <NumField compact label="H" value={el.h} min={8} disabled={locked} onChange={v => update('h', { h: v })} />
        </div>
      </Section>

      <Section title="Appearance">
        <div className="space-y-1.5">
          <NumField label="Opacity" suffix="%" value={el.opacity * 100} min={0} max={100} disabled={locked}
            onChange={v => update('opacity', { opacity: v / 100 })} />
          <NumField label="Radius" value={el.borderRadius} min={0} max={999} disabled={locked}
            onChange={v => update('borderRadius', { borderRadius: v })} />
          <NumField label="Rotation" suffix="°" value={el.rotation} min={-360} max={360} disabled={locked}
            onChange={v => update('rotation', { rotation: v })} />
          <label className="flex items-center gap-1.5">
            <span className="w-[52px] shrink-0 text-[11px] text-[#888]">Fill</span>
            <input type="color" aria-label="Fill colour" disabled={locked}
              value={el.style?.backgroundColor || '#f9f9f9'}
              onChange={e => update('fill', { style: { ...el.style, backgroundColor: e.target.value } })}
              className="h-6 flex-1 cursor-pointer rounded border border-white/10 bg-transparent disabled:cursor-not-allowed disabled:opacity-40" />
            <button type="button" disabled={locked || !el.style?.backgroundColor}
              onClick={() => update('fill-reset', { style: { ...el.style, backgroundColor: undefined } })}
              className="rounded px-1.5 py-0.5 text-[11px] text-[#888] hover:text-[#ddd] disabled:opacity-30">
              Reset
            </button>
          </label>
        </div>
      </Section>

      {(TEXT_TYPES.has(el.type) || LABEL_TYPES.has(el.type) || el.type === 'input' || el.type === 'table') && (
        <Section title="Content">
          {TEXT_TYPES.has(el.type) && (
            <TextField label="Text" value={el.props.text || ''} disabled={locked} multiline={el.type === 'text'}
              placeholder={el.type === 'text' ? 'Lorem ipsum…' : ELEMENT_LABELS[el.type]}
              onChange={v => updateProp('text', v)} />
          )}
          {LABEL_TYPES.has(el.type) && (
            <TextField label="Option label" value={el.props.label || ''} placeholder="Option" disabled={locked}
              onChange={v => updateProp('label', v)} />
          )}
          {el.type === 'input' && (
            <TextField label="Placeholder" value={el.props.placeholder || ''} placeholder="Placeholder..." disabled={locked}
              onChange={v => updateProp('placeholder', v)} />
          )}
          {el.type === 'table' && (
            <div className="space-y-1.5">
              <NumField label="Columns" value={el.props.columns || 3} min={1} max={12} disabled={locked}
                onChange={v => updateProp('columns', Math.round(v))} />
              <NumField label="Rows" value={el.props.rows || 4} min={1} max={30} disabled={locked}
                onChange={v => updateProp('rows', Math.round(v))} />
            </div>
          )}
        </Section>
      )}

      {actions}
    </div>
  );
}
