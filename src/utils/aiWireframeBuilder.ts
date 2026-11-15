import type { CanvasElement, ElementProps, ElementType } from '../types/editor';
import { DEFAULT_ELEMENT_SIZES, ELEMENT_LABELS } from '../types/editor';
import { createElement } from '../lib/elements';

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const SETTINGS_KEY = 'wiremi-ai-settings';
const LEGACY_KEY = 'groq-api-key';

export interface AISettings {
  apiKey: string;
  model: string;
}

export function loadAISettings(): AISettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (saved?.apiKey !== undefined) return { apiKey: saved.apiKey, model: saved.model || DEFAULT_GROQ_MODEL };
  } catch {
    // Fall through to the legacy key.
  }
  return { apiKey: localStorage.getItem(LEGACY_KEY) || '', model: DEFAULT_GROQ_MODEL };
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ apiKey: settings.apiKey.trim(), model: settings.model.trim() || DEFAULT_GROQ_MODEL }));
  localStorage.removeItem(LEGACY_KEY);
}

const TYPES: ElementType[] = (Object.keys(ELEMENT_LABELS) as ElementType[]).filter(t => t !== 'group');

const SYSTEM_PROMPT = `You generate wireframe layouts. Given a description of a web page or app screen, return a JSON object:
{"elements": [ ... ]}

Each element has:
- type: one of ${TYPES.join(', ')} (required)
- label: short display name (required)
- x, y: position in pixels from the top-left corner (required)
- w, h: size in pixels (optional; defaults: ${TYPES.map(t => `${t} ${DEFAULT_ELEMENT_SIZES[t].w}x${DEFAULT_ELEMENT_SIZES[t].h}`).join(', ')})
- props: { text?, placeholder?, label?, columns?, rows? } (optional)

Rules:
- Lay out a complete, realistic screen within 0-1280px wide, starting at y = 0.
- Navigation at the top or on the side, main content below or beside it.
- Leave 16-32px between blocks and align blocks on shared edges.
- Use frames or sections to contain areas, then put their components on top of them.
- Give buttons, badges and text real wording in props.text.

Return only the JSON object.`;

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || fallback);

function readElements(content: string): unknown[] {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.elements)) return data.elements;
  } catch {
    // Some models wrap the JSON in prose: keep the first array found.
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  }
  throw new Error('The AI answer could not be read. Try again or rephrase the description.');
}

export function toCanvasElements(raw: unknown[], pageId: string): CanvasElement[] {
  let z = 0;
  return raw.flatMap(item => {
    const r = item as Record<string, unknown>;
    const type = r?.type as ElementType;
    if (!TYPES.includes(type)) return [];
    const size = DEFAULT_ELEMENT_SIZES[type];
    const props = (r.props && typeof r.props === 'object' ? r.props : {}) as Record<string, unknown>;
    const clean: ElementProps = {};
    if (typeof props.text === 'string') clean.text = props.text;
    if (typeof props.placeholder === 'string') clean.placeholder = props.placeholder;
    if (typeof props.label === 'string') clean.label = props.label;
    if (props.columns !== undefined) clean.columns = Math.min(12, Math.max(1, Math.round(num(props.columns, 3))));
    if (props.rows !== undefined) clean.rows = Math.min(30, Math.max(1, Math.round(num(props.rows, 4))));
    const el = createElement(type, num(r.x, 0), num(r.y, 0), pageId, ++z);
    return [{
      ...el,
      label: typeof r.label === 'string' && r.label.trim() ? r.label.trim() : el.label,
      w: Math.max(8, Math.round(num(r.w, size.w))),
      h: Math.max(8, Math.round(num(r.h, size.h))),
      props: clean,
    }];
  });
}

export async function generateWireframe(prompt: string, pageId: string, settings: AISettings): Promise<CanvasElement[]> {
  let response: Response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settings.model || DEFAULT_GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
  } catch {
    throw new Error('Could not reach Groq. Check your internet connection.');
  }

  if (!response.ok) {
    let message = '';
    try {
      message = (await response.json())?.error?.message ?? '';
    } catch {
      // Keep the status only.
    }
    if (response.status === 401) throw new Error('Groq refused the API key. Check it in Settings.');
    if (response.status === 429) throw new Error('Groq rate limit reached. Wait a moment and try again.');
    throw new Error(`Groq error ${response.status}${message ? `: ${message}` : ''}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('The AI returned an empty answer. Try again.');
  const elements = toCanvasElements(readElements(content), pageId);
  if (!elements.length) throw new Error('The AI answer contained no usable component. Try a more detailed description.');
  return elements;
}
