import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyTemplate, CANVAS_TEMPLATES, createLayer, initialCanvas, PALETTE_PRESETS, serializeDesign } from '../client/src/lib/designCanvas';

describe('hands-on Design Studio canvas', () => {
  it('provides distinct editable templates with independently cloned layers', () => {
    expect(CANVAS_TEMPLATES.map((template) => template.id)).toEqual(['neon-poster', 'editorial-grid', 'product-signal']);
    const first = initialCanvas();
    const second = initialCanvas();
    first.layers[0].x = 4;
    expect(second.layers[0].x).not.toBe(4);
    expect(applyTemplate('product-signal').background).toBe('#101827');
  });

  it('creates text, shape, and image-placeholder layers with usable defaults', () => {
    expect(createLayer('text', 30)).toMatchObject({ kind: 'text', content: 'NEW IDEA', fontFamily: 'display' });
    expect(createLayer('shape', 30)).toMatchObject({ kind: 'shape', shape: 'circle' });
    expect(createLayer('image', 30)).toMatchObject({ kind: 'image', content: 'IMAGE / TEXTURE' });
    expect(PALETTE_PRESETS).toHaveLength(3);
  });

  it('exports a portable, versioned design specification without calling an AI provider', () => {
    const design = initialCanvas();
    const output = JSON.parse(serializeDesign('Signal Poster', design.background, design.layers));
    expect(output).toMatchObject({ version: 1, name: 'Signal Poster', canvas: { width: 1440, height: 900 } });
    expect(output.layers).toHaveLength(design.layers.length);
  });

  it('keeps direct drag controls and the optional advisor explicitly separate in the UI', () => {
    const canvas = readFileSync(resolve(process.cwd(), 'client/src/components/DesignCanvas.tsx'), 'utf8');
    const studio = readFileSync(resolve(process.cwd(), 'client/src/pages/DesignStudio.tsx'), 'utf8');
    expect(canvas).toContain('onPointerDown');
    expect(canvas).toContain('Drag to reposition.');
    expect(canvas).toContain('Export spec');
    expect(studio).toContain('This is the design surface—not a chat prompt.');
    expect(studio).toContain('Optional direction desk');
  });

  it('provides configurable focus-safe keyboard commands without overriding normal Tab navigation', () => {
    const canvas = readFileSync(resolve(process.cwd(), 'client/src/components/DesignCanvas.tsx'), 'utf8');
    expect(canvas).toContain("canvas-commands-enabled");
    expect(canvas).toContain("event.key === '['");
    expect(canvas).toContain("event.key === ']'");
    expect(canvas).toContain('const isTyping =');
    expect(canvas).toContain('Tab remains available for normal focus navigation.');
    expect(canvas).not.toContain("event.key === 'Tab'");
  });
});
