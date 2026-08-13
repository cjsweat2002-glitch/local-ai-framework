import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Aperture, Download, Eye, Focus, Image as ImageIcon, Keyboard, Layers3, Redo2, SlidersHorizontal, Square, Type, Undo2 } from 'lucide-react';
import { applyTemplate, CANVAS_TEMPLATES, createLayer, initialCanvas, PALETTE_PRESETS, serializeDesign, type CanvasLayer, type CanvasLayerKind, type CanvasTemplate } from '@/lib/designCanvas';

type CanvasState = ReturnType<typeof initialCanvas>;

const layerIcon = (kind: CanvasLayerKind) => kind === 'text' ? Type : kind === 'image' ? ImageIcon : Square;

const layerLabel = (kind: CanvasLayerKind) => kind === 'text' ? 'Text' : kind === 'image' ? 'Image' : 'Shape';

function cloneState(state: CanvasState): CanvasState {
  return { ...state, layers: state.layers.map((layer) => ({ ...layer })) };
}

export default function DesignCanvas({ onOpenAdvisor }: { onOpenAdvisor: () => void }) {
  const [design, setDesign] = useState<CanvasState>(() => initialCanvas());
  const [selectedLayerId, setSelectedLayerId] = useState(design.layers[0]?.id || '');
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [future, setFuture] = useState<CanvasState[]>([]);
  const [designName, setDesignName] = useState('Untitled signal composition');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandsEnabled, setCommandsEnabled] = useState(() => typeof window === 'undefined' ? true : window.localStorage.getItem('canvas-commands-enabled') !== 'false');
  const [nudgeStep, setNudgeStep] = useState(() => typeof window === 'undefined' ? 2 : Number(window.localStorage.getItem('canvas-nudge-step') || 2));
  const [lastCommand, setLastCommand] = useState('Canvas ready');
  const [workspaceMode, setWorkspaceMode] = useState<'compose' | 'focus' | 'preview'>('compose');
  const stageRef = useRef<HTMLDivElement>(null);
  const designRef = useRef(design);
  const dragRef = useRef<{ layerId: string; startClientX: number; startClientY: number; originX: number; originY: number; width: number; height: number } | null>(null);
  const selectedLayer = useMemo(() => design.layers.find((layer) => layer.id === selectedLayerId) || design.layers[0], [design.layers, selectedLayerId]);

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  useEffect(() => {
    window.localStorage.setItem('canvas-commands-enabled', String(commandsEnabled));
    window.localStorage.setItem('canvas-nudge-step', String(nudgeStep));
  }, [commandsEnabled, nudgeStep]);

  const commit = (next: CanvasState) => {
    setHistory((current) => [...current.slice(-19), cloneState(design)]);
    setFuture([]);
    setDesign(next);
  };

  const updateLayer = (patch: Partial<CanvasLayer>) => {
    if (!selectedLayer) return;
    commit({ ...design, layers: design.layers.map((layer) => layer.id === selectedLayer.id ? { ...layer, ...patch } : layer) });
  };

  const chooseTemplate = (id: CanvasTemplate['id']) => {
    const next = applyTemplate(id);
    commit(next);
    setSelectedLayerId(next.layers[0]?.id || '');
  };

  const addLayer = (kind: CanvasLayerKind) => {
    const layer = createLayer(kind, 22 + ((design.layers.length * 9) % 52));
    commit({ ...design, layers: [...design.layers, layer] });
    setSelectedLayerId(layer.id);
    setLastCommand(`Added ${layerLabel(kind).toLowerCase()} layer`);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((current) => [cloneState(design), ...current]);
    setHistory((current) => current.slice(0, -1));
    setDesign(previous);
    setSelectedLayerId(previous.layers[0]?.id || '');
    setLastCommand('Undid last change');
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, cloneState(design)]);
    setFuture((current) => current.slice(1));
    setDesign(next);
    setSelectedLayerId(next.layers[0]?.id || '');
    setLastCommand('Redid last change');
  };

  const applyPalette = (paletteId: string) => {
    const palette = PALETTE_PRESETS.find((item) => item.id === paletteId) || PALETTE_PRESETS[0];
    const layers = design.layers.map((layer, index) => ({
      ...layer,
      color: layer.kind === 'text' ? palette.colors[index % 2] : palette.colors[(index + 1) % palette.colors.length],
    }));
    commit({ ...design, background: palette.background, layers });
    setLastCommand(`Applied ${palette.name}`);
  };

  const downloadSpec = () => {
    const blob = new Blob([serializeDesign(designName, design.background, design.layers)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${designName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'}-spec.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setLastCommand('Downloaded design specification');
  };

  const moveSelected = (xDelta: number, yDelta: number) => {
    if (!selectedLayer) return;
    const x = Math.min(Math.max(0, selectedLayer.x + xDelta), 100 - selectedLayer.width);
    const y = Math.min(Math.max(0, selectedLayer.y + yDelta), 100 - selectedLayer.height);
    commit({ ...design, layers: design.layers.map((layer) => layer.id === selectedLayer.id ? { ...layer, x, y } : layer) });
    setLastCommand(`Moved ${selectedLayer.name}`);
  };

  const selectRelativeLayer = (delta: number) => {
    if (!design.layers.length) return;
    const currentIndex = Math.max(0, design.layers.findIndex((layer) => layer.id === selectedLayer?.id));
    const next = design.layers[(currentIndex + delta + design.layers.length) % design.layers.length];
    setSelectedLayerId(next.id);
    setLastCommand(`Selected ${next.name}`);
  };

  const duplicateSelected = () => {
    if (!selectedLayer) return;
    const duplicate = { ...selectedLayer, id: `${selectedLayer.id}-copy-${Date.now()}`, name: `${selectedLayer.name} copy`, x: Math.min(100 - selectedLayer.width, selectedLayer.x + 3), y: Math.min(100 - selectedLayer.height, selectedLayer.y + 3) };
    commit({ ...design, layers: [...design.layers, duplicate] });
    setSelectedLayerId(duplicate.id);
    setLastCommand(`Duplicated ${selectedLayer.name}`);
  };

  const deleteSelected = () => {
    if (!selectedLayer || design.layers.length < 2) return;
    const remaining = design.layers.filter((layer) => layer.id !== selectedLayer.id);
    commit({ ...design, layers: remaining });
    setSelectedLayerId(remaining.at(-1)?.id || '');
    setLastCommand(`Deleted ${selectedLayer.name}`);
  };

  const startDrag = (layer: CanvasLayer, event: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if ('pointerId' in event) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some embedded or synthetic pointer environments do not support capture; coordinates still remain usable.
      }
    }
    setSelectedLayerId(layer.id);
    dragRef.current = { layerId: layer.id, startClientX: event.clientX, startClientY: event.clientY, originX: layer.x, originY: layer.y, width: layer.width, height: layer.height };
    setHistory((current) => [...current.slice(-19), cloneState(designRef.current)]);
    setFuture([]);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const bounds = stage.getBoundingClientRect();
    const x = Math.min(Math.max(0, drag.originX + ((event.clientX - drag.startClientX) / bounds.width) * 100), 100 - drag.width);
    const y = Math.min(Math.max(0, drag.originY + ((event.clientY - drag.startClientY) / bounds.height) * 100), 100 - drag.height);
    setDesign((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === drag.layerId ? { ...layer, x, y } : layer) }));
  };

  const endDrag = () => { dragRef.current = null; };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!commandsEnabled) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || Boolean(target?.isContentEditable);
      if (isTyping) return;
      const modifier = event.metaKey || event.ctrlKey;
      const step = event.shiftKey ? nudgeStep * 4 : nudgeStep;
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (modifier && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); return; }
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelected(-step, 0); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveSelected(step, 0); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); moveSelected(0, -step); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); moveSelected(0, step); return; }
      if (event.key === '[') { event.preventDefault(); selectRelativeLayer(-1); return; }
      if (event.key === ']') { event.preventDefault(); selectRelativeLayer(1); return; }
      if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); deleteSelected(); return; }
      if (event.key.toLowerCase() === 't') { event.preventDefault(); addLayer('text'); return; }
      if (event.key.toLowerCase() === 's') { event.preventDefault(); addLayer('shape'); return; }
      if (event.key.toLowerCase() === 'i') { event.preventDefault(); addLayer('image'); return; }
      if (event.key.toLowerCase() === 'e') { event.preventDefault(); downloadSpec(); return; }
      if (event.key === '?') { event.preventDefault(); setShortcutsOpen((open) => !open); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandsEnabled, design, nudgeStep, selectedLayer, selectedLayerId]);

  const centerSelected = () => {
    if (!selectedLayer) return;
    updateLayer({ x: Math.max(0, Math.round((100 - selectedLayer.width) / 2)), y: Math.max(0, Math.round((100 - selectedLayer.height) / 2)) });
    setLastCommand(`Centered ${selectedLayer.name}`);
  };

  return <section className={`design-workbench design-workbench--${workspaceMode}`} aria-label="Interactive design canvas">
    <div className="design-workbench__toolbar">
      <div className="flex flex-wrap items-center gap-2"><span className="signal-pill"><span className="signal-dot" />Hands-on canvas</span><span className="tech-label">Direct composition tools</span></div>
      <div className="flex flex-wrap items-center gap-1.5"><div className="workspace-mode-switch" role="group" aria-label="Canvas workspace mode"><Button type="button" variant="ghost" className={`canvas-tool ${workspaceMode === 'compose' ? 'canvas-tool--active' : ''}`} onClick={() => setWorkspaceMode('compose')} aria-pressed={workspaceMode === 'compose'}><SlidersHorizontal className="h-3.5 w-3.5" />Compose</Button><Button type="button" variant="ghost" className={`canvas-tool ${workspaceMode === 'focus' ? 'canvas-tool--active' : ''}`} onClick={() => setWorkspaceMode('focus')} aria-pressed={workspaceMode === 'focus'}><Focus className="h-3.5 w-3.5" />Focus</Button><Button type="button" variant="ghost" className={`canvas-tool ${workspaceMode === 'preview' ? 'canvas-tool--active' : ''}`} onClick={() => setWorkspaceMode('preview')} aria-pressed={workspaceMode === 'preview'}><Eye className="h-3.5 w-3.5" />Preview</Button></div><Button type="button" variant="outline" className="canvas-tool" onClick={() => setShortcutsOpen((open) => !open)} aria-expanded={shortcutsOpen} aria-controls="canvas-shortcuts"><Keyboard className="h-3.5 w-3.5" />Shortcuts</Button><Button type="button" variant="outline" className="canvas-tool" onClick={undo} disabled={!history.length} aria-label="Undo last canvas change"><Undo2 className="h-3.5 w-3.5" />Undo</Button><Button type="button" variant="outline" className="canvas-tool" onClick={redo} disabled={!future.length} aria-label="Redo last canvas change"><Redo2 className="h-3.5 w-3.5" />Redo</Button><Button type="button" className="btn-primary canvas-tool" onClick={downloadSpec}><Download className="h-3.5 w-3.5" />Export spec</Button></div>
    </div>
    {selectedLayer && workspaceMode !== 'preview' && <div className="canvas-context-strip" aria-label="Active layer options"><div><p className="tech-label">Active selection</p><div className="flex flex-wrap items-center gap-2"><strong>{selectedLayer.name}</strong><span>{layerLabel(selectedLayer.kind)}</span></div></div><div className="canvas-context-strip__controls"><label><span>X</span><input type="number" min="0" max="100" value={Math.round(selectedLayer.x)} onChange={(event) => updateLayer({ x: Number(event.target.value) })} /></label><label><span>Y</span><input type="number" min="0" max="100" value={Math.round(selectedLayer.y)} onChange={(event) => updateLayer({ y: Number(event.target.value) })} /></label><label><span>Rotate</span><input type="number" min="-180" max="180" value={Math.round(selectedLayer.rotation)} onChange={(event) => updateLayer({ rotation: Number(event.target.value) })} /></label><Button type="button" variant="outline" className="canvas-tool" onClick={centerSelected}>Center layer</Button></div></div>}
    {shortcutsOpen && <div id="canvas-shortcuts" className="shortcut-dock"><div><p className="tech-label">Canvas commands</p><h3 className="blueprint-headline mt-1 text-2xl">Stay in the composition.</h3><p className="mt-1 text-sm text-muted-foreground">Commands pause automatically while you are typing in any field. Tab remains available for normal focus navigation.</p></div><div className="shortcut-dock__commands"><span><kbd>← ↑ ↓ →</kbd>Move layer</span><span><kbd>Shift + arrows</kbd>Large move</span><span><kbd>[ / ]</kbd>Previous / next layer</span><span><kbd>⌘/Ctrl + D</kbd>Duplicate</span><span><kbd>Delete</kbd>Remove</span><span><kbd>T / S / I</kbd>Add text / shape / image</span><span><kbd>⌘/Ctrl + Z</kbd>Undo</span><span><kbd>E</kbd>Export spec</span></div><div className="shortcut-dock__settings"><label><span>Enable commands</span><input type="checkbox" checked={commandsEnabled} onChange={(event) => setCommandsEnabled(event.target.checked)} /></label><label><span>Nudge step <strong>{nudgeStep}%</strong></span><input type="range" min="1" max="10" value={nudgeStep} onChange={(event) => setNudgeStep(Number(event.target.value))} /></label></div></div>}

    <div className="design-workbench__body">
      <aside className="canvas-rail" aria-label="Canvas templates and layers">
        <div><p className="tech-label">Templates</p><div className="mt-2 space-y-1.5">{CANVAS_TEMPLATES.map((template) => <button className={`canvas-template ${design.templateId === template.id ? 'canvas-template--active' : ''}`} type="button" key={template.id} onClick={() => chooseTemplate(template.id)} aria-pressed={design.templateId === template.id}><span className="canvas-template__mini" data-template={template.id} /><span><strong>{template.name}</strong><small>{template.description}</small></span></button>)}</div></div>
        <div className="mt-6"><p className="tech-label">Add layer</p><div className="mt-2 grid grid-cols-3 gap-1.5"><Button type="button" variant="outline" className="canvas-add" onClick={() => addLayer('text')}><Type className="h-3.5 w-3.5" />Text</Button><Button type="button" variant="outline" className="canvas-add" onClick={() => addLayer('shape')}><Square className="h-3.5 w-3.5" />Shape</Button><Button type="button" variant="outline" className="canvas-add" onClick={() => addLayer('image')}><ImageIcon className="h-3.5 w-3.5" />Image</Button></div></div>
        <div className="mt-6"><p className="tech-label">Layers</p><div className="mt-2 space-y-1">{[...design.layers].reverse().map((layer) => { const Icon = layerIcon(layer.kind); return <button key={layer.id} type="button" className={`layer-row ${layer.id === selectedLayer?.id ? 'layer-row--active' : ''}`} onClick={() => setSelectedLayerId(layer.id)} aria-pressed={layer.id === selectedLayer?.id}><Icon className="h-3.5 w-3.5" /><span>{layer.name}</span><small>{layerLabel(layer.kind)}</small></button>; })}</div></div>
      </aside>

      <div className="canvas-stage-wrap"><div ref={stageRef} className="canvas-stage" style={{ background: design.background }} aria-label="Editable composition preview">
        <div className="canvas-stage__grid" />
        {design.layers.map((layer) => {
          const selected = layer.id === selectedLayer?.id;
          const commonStyle: React.CSSProperties = { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: `rotate(${layer.rotation}deg)`, opacity: layer.opacity };
          const dragEvents = { onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => startDrag(layer, event), onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag, onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => startDrag(layer, event), onMouseMove: moveDrag, onMouseUp: endDrag };
          if (layer.kind === 'text') return <button key={layer.id} type="button" className={`canvas-object canvas-object--text ${selected ? 'canvas-object--selected' : ''}`} style={{ ...commonStyle, color: layer.color, fontFamily: `var(--font-${layer.fontFamily || 'sans'})`, fontWeight: layer.fontWeight, fontSize: `clamp(11px, ${(layer.fontSize || 4) * 0.52}vw, 104px)` }} onClick={() => setSelectedLayerId(layer.id)} aria-label={`Select ${layer.name}. Drag to reposition.`} {...dragEvents}>{layer.content}</button>;
          if (layer.kind === 'shape') return <button key={layer.id} type="button" className={`canvas-object canvas-object--shape ${selected ? 'canvas-object--selected' : ''} canvas-object--${layer.shape || 'square'}`} style={{ ...commonStyle, background: layer.color }} onClick={() => setSelectedLayerId(layer.id)} aria-label={`Select ${layer.name}. Drag to reposition.`} {...dragEvents} />;
          return <button key={layer.id} type="button" className={`canvas-object canvas-object--image ${selected ? 'canvas-object--selected' : ''}`} style={{ ...commonStyle, background: layer.color }} onClick={() => setSelectedLayerId(layer.id)} aria-label={`Select ${layer.name}. Drag to reposition.`} {...dragEvents}><ImageIcon className="h-5 w-5" /><span>{layer.content || 'IMAGE'}</span><small>Drop asset later</small></button>;
        })}
        <div className="canvas-stage__stamp">AUTONOMOUS / VISUAL SYSTEM</div>
      </div><div className="canvas-stage__meta"><span>1440 × 900</span><span>Drag a layer or use the inspector</span><span>{design.layers.length} layers</span><span aria-live="polite">{lastCommand}</span></div></div>

      <aside className="canvas-inspector" aria-label="Selected layer inspector">
        <div className="flex items-center justify-between"><div><p className="tech-label">Inspector</p><h3 className="blueprint-headline mt-1 text-2xl">{selectedLayer?.name || 'No layer'}</h3></div><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-950/10 bg-cyan-50"><Layers3 className="h-4 w-4 text-cyan-700" /></span></div>
        {selectedLayer && <div className="mt-5 space-y-4">
          {(selectedLayer.kind === 'text' || selectedLayer.kind === 'image') && <label className="inspector-field"><span>{selectedLayer.kind === 'text' ? 'Content' : 'Asset label'}</span><Input value={selectedLayer.content || ''} onChange={(event) => updateLayer({ content: event.target.value })} /></label>}
          <label className="inspector-field"><span>Layer name</span><Input value={selectedLayer.name} onChange={(event) => updateLayer({ name: event.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2"><label className="inspector-field"><span>Color</span><input className="color-control" type="color" value={selectedLayer.color} onChange={(event) => updateLayer({ color: event.target.value })} /></label><label className="inspector-field"><span>Opacity</span><input type="range" min="0.15" max="1" step="0.05" value={selectedLayer.opacity} onChange={(event) => updateLayer({ opacity: Number(event.target.value) })} /></label></div>
          <div className="inspector-grid"><label className="inspector-field"><span>X</span><input type="number" min="0" max="100" value={Math.round(selectedLayer.x)} onChange={(event) => updateLayer({ x: Number(event.target.value) })} /></label><label className="inspector-field"><span>Y</span><input type="number" min="0" max="100" value={Math.round(selectedLayer.y)} onChange={(event) => updateLayer({ y: Number(event.target.value) })} /></label><label className="inspector-field"><span>Width</span><input type="number" min="1" max="100" value={Math.round(selectedLayer.width)} onChange={(event) => updateLayer({ width: Number(event.target.value) })} /></label><label className="inspector-field"><span>Height</span><input type="number" min="1" max="100" value={Math.round(selectedLayer.height)} onChange={(event) => updateLayer({ height: Number(event.target.value) })} /></label><label className="inspector-field"><span>Rotate</span><input type="number" min="-180" max="180" value={Math.round(selectedLayer.rotation)} onChange={(event) => updateLayer({ rotation: Number(event.target.value) })} /></label></div>
          {selectedLayer.kind === 'text' && <div className="grid grid-cols-2 gap-2"><label className="inspector-field"><span>Type scale</span><input type="range" min="2" max="20" value={selectedLayer.fontSize || 5} onChange={(event) => updateLayer({ fontSize: Number(event.target.value) })} /></label><label className="inspector-field"><span>Weight</span><select value={selectedLayer.fontWeight || 500} onChange={(event) => updateLayer({ fontWeight: Number(event.target.value) as 500 | 700 | 900 })}><option value="500">Regular</option><option value="700">Bold</option><option value="900">Black</option></select></label></div>}
        </div>}
        <div className="mt-6 border-t border-slate-900/8 pt-5"><p className="tech-label">Palette behavior</p><div className="mt-2 grid gap-1.5">{PALETTE_PRESETS.map((palette) => <button type="button" key={palette.id} className="palette-preset" onClick={() => applyPalette(palette.id)}><span>{palette.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><strong>{palette.name}</strong></button>)}</div></div>
        <div className="canvas-advisor mt-6"><Aperture className="h-4 w-4 text-pink-500" /><div><p className="tech-label">Optional engine advisor</p><p>Use a creative engine only when you want a second opinion—not to make the composition for you.</p></div><Button type="button" variant="outline" className="mt-3 w-full" onClick={onOpenAdvisor}>Open direction tools</Button></div>
      </aside>
    </div>

    <div className="design-workbench__footer"><div><p className="tech-label">Design file</p><Input value={designName} onChange={(event) => setDesignName(event.target.value)} aria-label="Design file name" /></div><p className="text-sm leading-relaxed text-muted-foreground">This is a local, editable composition. Export a JSON design spec to keep its layer data, palette, and geometry portable.</p></div>
  </section>;
}
