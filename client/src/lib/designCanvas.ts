export type CanvasLayerKind = 'text' | 'shape' | 'image';

export type CanvasLayer = {
  id: string;
  kind: CanvasLayerKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  color: string;
  content?: string;
  fontSize?: number;
  fontFamily?: 'display' | 'sans' | 'mono';
  fontWeight?: 500 | 700 | 900;
  shape?: 'circle' | 'square' | 'line';
};

export type CanvasTemplate = {
  id: 'neon-poster' | 'editorial-grid' | 'product-signal';
  name: string;
  description: string;
  layers: CanvasLayer[];
  background: string;
};

const cloneLayers = (layers: CanvasLayer[]) => layers.map((layer) => ({ ...layer }));

export const PALETTE_PRESETS = [
  { id: 'cyan-signal', name: 'Cyan Signal', background: '#f6fcfa', colors: ['#082c35', '#0db7c4', '#e978ad', '#f8f2cf'] },
  { id: 'night-orbit', name: 'Night Orbit', background: '#101827', colors: ['#f4f8ff', '#7ae3e7', '#bd95ff', '#ff8dbb'] },
  { id: 'paper-coral', name: 'Paper Coral', background: '#fffaf5', colors: ['#2c2530', '#e97a64', '#6450a6', '#f5bf4b'] },
] as const;

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'neon-poster',
    name: 'Neon Poster',
    description: 'A high-contrast culture signal with oversized type and asymmetric color fields.',
    background: '#f6fcfa',
    layers: [
      { id: 'poster-orbit', kind: 'shape', name: 'Orbit field', x: 70, y: 25, width: 26, height: 26, rotation: 0, opacity: 1, color: '#0db7c4', shape: 'circle' },
      { id: 'poster-signal', kind: 'shape', name: 'Signal field', x: 77, y: 45, width: 34, height: 34, rotation: 25, opacity: 0.8, color: '#e978ad', shape: 'square' },
      { id: 'poster-title', kind: 'text', name: 'Poster title', x: 8, y: 15, width: 62, height: 28, rotation: 0, opacity: 1, color: '#082c35', content: `MAKE\nA SIGNAL`, fontSize: 16, fontFamily: 'display', fontWeight: 900 },
      { id: 'poster-caption', kind: 'text', name: 'Poster caption', x: 10, y: 63, width: 38, height: 10, rotation: 0, opacity: 1, color: '#082c35', content: 'FUTURE CULTURE / 2026', fontSize: 2.2, fontFamily: 'mono', fontWeight: 700 },
      { id: 'poster-image', kind: 'image', name: 'Image block', x: 48, y: 57, width: 40, height: 27, rotation: 0, opacity: 1, color: '#f8f2cf', content: 'PLACE IMAGE OR TEXTURE' },
    ],
  },
  {
    id: 'editorial-grid',
    name: 'Editorial Grid',
    description: 'A calm typographic composition for a cover, feature story, or publication spread.',
    background: '#fffaf5',
    layers: [
      { id: 'editorial-rule', kind: 'shape', name: 'Vertical rule', x: 12, y: 8, width: 1.1, height: 80, rotation: 0, opacity: 1, color: '#e97a64', shape: 'line' },
      { id: 'editorial-title', kind: 'text', name: 'Editorial headline', x: 19, y: 14, width: 55, height: 24, rotation: 0, opacity: 1, color: '#2c2530', content: `DESIGN\nWITH INTENT`, fontSize: 14, fontFamily: 'display', fontWeight: 900 },
      { id: 'editorial-deck', kind: 'text', name: 'Editorial deck', x: 20, y: 52, width: 31, height: 18, rotation: 0, opacity: 0.9, color: '#2c2530', content: 'A visual system is a way of deciding what belongs together.', fontSize: 2.6, fontFamily: 'sans', fontWeight: 500 },
      { id: 'editorial-image', kind: 'image', name: 'Feature image', x: 58, y: 18, width: 30, height: 54, rotation: 0, opacity: 1, color: '#f5bf4b', content: 'DROP FEATURE IMAGE' },
    ],
  },
  {
    id: 'product-signal',
    name: 'Product Signal',
    description: 'A product-launch composition with a clear promise, visual object, and call to action.',
    background: '#101827',
    layers: [
      { id: 'product-glow', kind: 'shape', name: 'Glow field', x: 63, y: 10, width: 34, height: 34, rotation: 0, opacity: 0.85, color: '#bd95ff', shape: 'circle' },
      { id: 'product-title', kind: 'text', name: 'Product promise', x: 9, y: 18, width: 48, height: 24, rotation: 0, opacity: 1, color: '#f4f8ff', content: `BUILD\nTHE NEXT`, fontSize: 15, fontFamily: 'display', fontWeight: 900 },
      { id: 'product-copy', kind: 'text', name: 'Product copy', x: 10, y: 58, width: 35, height: 10, rotation: 0, opacity: 0.95, color: '#f4f8ff', content: 'A new system for people who make ideas visible.', fontSize: 2.4, fontFamily: 'sans', fontWeight: 500 },
      { id: 'product-image', kind: 'image', name: 'Product visual', x: 55, y: 42, width: 34, height: 35, rotation: -8, opacity: 1, color: '#7ae3e7', content: 'PRODUCT VISUAL' },
      { id: 'product-cta', kind: 'shape', name: 'CTA bar', x: 10, y: 77, width: 27, height: 7, rotation: 0, opacity: 1, color: '#ff8dbb', shape: 'square' },
    ],
  },
];

export const initialCanvas = () => ({
  templateId: CANVAS_TEMPLATES[0].id,
  background: CANVAS_TEMPLATES[0].background,
  layers: cloneLayers(CANVAS_TEMPLATES[0].layers),
});

export const applyTemplate = (templateId: CanvasTemplate['id']) => {
  const template = CANVAS_TEMPLATES.find((item) => item.id === templateId) || CANVAS_TEMPLATES[0];
  return { templateId: template.id, background: template.background, layers: cloneLayers(template.layers) };
};

export const createLayer = (kind: CanvasLayerKind, position: number): CanvasLayer => {
  const id = `${kind}-${Date.now()}`;
  if (kind === 'text') return { id, kind, name: 'New headline', x: 18, y: position, width: 45, height: 12, rotation: 0, opacity: 1, color: '#082c35', content: 'NEW IDEA', fontSize: 9, fontFamily: 'display', fontWeight: 900 };
  if (kind === 'image') return { id, kind, name: 'Image placeholder', x: 50, y: position, width: 30, height: 24, rotation: 0, opacity: 1, color: '#d9f5f3', content: 'IMAGE / TEXTURE' };
  return { id, kind, name: 'New shape', x: 62, y: position, width: 17, height: 17, rotation: 0, opacity: 1, color: '#e978ad', shape: 'circle' };
};

export const serializeDesign = (name: string, background: string, layers: CanvasLayer[]) => JSON.stringify({
  version: 1,
  name,
  canvas: { width: 1440, height: 900, background },
  layers,
  exportedAt: new Date().toISOString(),
}, null, 2);
