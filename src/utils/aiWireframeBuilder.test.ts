import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWireframe, toCanvasElements } from './aiWireframeBuilder';

const settings = { apiKey: 'test-key', model: 'test-model' };

function mockAnswer(content: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify(status === 200 ? { choices: [{ message: { content } }] } : { error: { message: content } }), { status }),
  ));
}

afterEach(() => vi.unstubAllGlobals());

describe('toCanvasElements', () => {
  it('keeps known types, fills defaults and cleans props', () => {
    const els = toCanvasElements(
      [
        { type: 'navbar', label: 'Top', x: 0, y: 0, w: 1200 },
        { type: 'spaceship', x: 1, y: 1 },
        { type: 'table', x: '10', y: 20, props: { columns: 99, evil: '<script>' } },
      ],
      'p1',
    );
    expect(els.map(e => e.type)).toEqual(['navbar', 'table']);
    expect(els[0]).toMatchObject({ label: 'Top', w: 1200, h: 56, pageId: 'p1', parentId: null });
    expect(els[1]).toMatchObject({ x: 10, label: 'Table', props: { columns: 12 } });
    expect(els[1].props).not.toHaveProperty('evil');
  });
});

describe('generateWireframe', () => {
  it('reads an object answer', async () => {
    mockAnswer('{"elements":[{"type":"button","label":"Go","x":5,"y":5,"props":{"text":"Go"}}]}');
    const els = await generateWireframe('a button', 'p1', settings);
    expect(els).toHaveLength(1);
    expect(els[0].props.text).toBe('Go');
  });

  it('reads an array wrapped in a code block and prose', async () => {
    mockAnswer('Here you go:\n```json\n[{"type":"text","label":"Intro","x":0,"y":0}]\n```');
    expect(await generateWireframe('text', 'p1', settings)).toHaveLength(1);
  });

  it('explains a refused key', async () => {
    mockAnswer('Invalid API Key', 401);
    await expect(generateWireframe('x', 'p1', settings)).rejects.toThrow(/API key/);
  });

  it('fails clearly when nothing usable comes back', async () => {
    mockAnswer('{"elements":[{"type":"unknown"}]}');
    await expect(generateWireframe('x', 'p1', settings)).rejects.toThrow(/no usable component/);
  });
});
