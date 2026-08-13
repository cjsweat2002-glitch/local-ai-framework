import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DesignCanvas from '@/components/DesignCanvas';
import { ArrowUpRight, Aperture, Blocks, Compass, Gem, Layers3, Sparkles } from 'lucide-react';
import { DESIGN_ENGINES, getEnginePrompts, type DesignEngine } from '@/lib/designEngines';

const ENGINE_ICONS = [Aperture, Sparkles, Layers3, Blocks, Gem, Compass] as const;

function routeFor(engine: DesignEngine) {
  if (engine.workspace === 'Gemini Developer') return '/gemini-developer';
  if (engine.workspace === 'System Factory') return '/system-factory';
  return '/';
}

export default function DesignStudio() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedEngineId, setSelectedEngineId] = useState(DESIGN_ENGINES[0].id);
  const [projectBrief, setProjectBrief] = useState('a future-facing graphic design platform that helps ambitious creators make distinct work');
  const [promptIndex, setPromptIndex] = useState(0);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const selectedEngine = DESIGN_ENGINES.find((engine) => engine.id === selectedEngineId) || DESIGN_ENGINES[0];
  const prompts = useMemo(() => getEnginePrompts(selectedEngine, projectBrief), [projectBrief, selectedEngine]);

  const handoff = (destination = '/') => {
    sessionStorage.setItem('designStudioHandoff', JSON.stringify({ engineId: selectedEngine.id, engineName: selectedEngine.name, prompt: prompts[promptIndex], prompts }));
    setLocation(destination);
  };

  if (loading) return <main className="blueprint-page flex min-h-screen items-center justify-center bg-background p-6"><div className="blueprint-panel rounded-2xl p-8 text-center"><span className="orbital-mark mx-auto mb-4"><Aperture className="relative z-10 h-5 w-5" /></span><p className="tech-label">Preparing the canvas</p></div></main>;
  if (!isAuthenticated) return <main className="blueprint-page flex min-h-screen items-center justify-center bg-background p-6"><div className="blueprint-panel blueprint-panel--glow max-w-xl rounded-3xl p-10 text-center"><span className="orbital-mark mx-auto mb-5 h-14 w-14"><Aperture className="relative z-10 h-6 w-6" /></span><p className="tech-label text-cyan-700">Hands-on visual workspace</p><h1 className="blueprint-headline mt-3 text-5xl">Make the work<br />on the canvas.</h1><p className="mt-5 text-sm leading-relaxed text-muted-foreground">Sign in to build an editable composition with layers, layouts, type, color, and an optional creative advisor when you need it.</p><Button onClick={startLogin} className="btn-primary mt-7 rounded-xl px-6">Open Design Studio <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></main>;

  return <main className="blueprint-page min-h-screen bg-background text-foreground">
    <header className="lab-topbar px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="orbital-mark h-10 w-10"><Aperture className="relative z-10 h-4 w-4" /></span><div><p className="tech-label text-[10px] text-cyan-700">Hands-on visual workspace</p><h1 className="blueprint-headline mt-1 text-3xl">Design Studio</h1></div></div><nav className="flex flex-wrap items-center gap-1.5" aria-label="Design Studio destinations"><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/task-history')}>Task History</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/activity-pulse')}>Activity Pulse</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/system-factory')}>System Factory</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/gemini-developer')}>Gemini Dev</Button><span className="hidden border-l border-slate-900/10 pl-3 text-xs text-muted-foreground xl:inline">{user?.name || user?.email}</span><Button variant="ghost" className="nav-sector hidden sm:inline-flex" onClick={logout}>Sign Out</Button></nav></div></header>

    <section className="mx-auto max-w-[1560px] px-4 py-5 sm:px-8 sm:py-8">
      <div className="canvas-intro mb-5"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="signal-pill"><span className="signal-dot" />Canvas mode</span><span className="tech-label">Create first · advise second</span></div><h2 className="blueprint-headline max-w-3xl text-4xl leading-[0.95] sm:text-5xl">Compose it. Move it.<br />Make it yours.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">This is the design surface—not a chat prompt. Select a layer, edit the geometry, tune color and typography, switch layouts, and export the visual system when it is ready.</p></div><div className="canvas-intro__legend"><span><i className="bg-cyan-400" />Direct edit</span><span><i className="bg-pink-400" />Visual layer</span><span><i className="bg-violet-400" />Optional advisor</span></div></div>
      <DesignCanvas onOpenAdvisor={() => setShowAdvisor((open) => !open)} />

      <section className={`direction-desk ${showAdvisor ? 'direction-desk--open' : ''}`} aria-label="Optional creative direction tools">
        <div className="direction-desk__heading"><div><p className="tech-label">Optional direction desk</p><h2 className="blueprint-headline mt-1 text-3xl">Ask for a lens only when you need one.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">The engines now act as creative advisors. They can sharpen a decision or carry a brief into the wider workspace, but they do not replace your composition tools.</p></div><Button variant="outline" className="rounded-xl border-cyan-950/15 bg-white/70" onClick={() => setShowAdvisor((open) => !open)}>{showAdvisor ? 'Close direction desk' : 'Open direction desk'} <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
        {showAdvisor && <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{DESIGN_ENGINES.map((engine, index) => { const Icon = ENGINE_ICONS[index]; const active = engine.id === selectedEngine.id; return <button key={engine.id} type="button" className={`engine-card engine-card--${engine.accent} ${active ? 'engine-card--active' : ''}`} aria-pressed={active} onClick={() => { setSelectedEngineId(engine.id); setPromptIndex(0); }}><div className="mb-6 flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-900/8 bg-white/80"><Icon className="h-4 w-4" /></span><span className="tech-label text-[10px]">{engine.index}</span></div><p className="tech-label text-[10px]">{engine.category}</p><h3 className="blueprint-headline mt-2 text-2xl">{engine.name}</h3><p className="mt-3 text-sm leading-relaxed text-slate-600">{engine.description}</p><div className="mt-5 flex flex-wrap gap-1.5">{engine.outputs.map((output) => <span className="engine-output" key={output}>{output}</span>)}</div></button>; })}</div></div><aside className={`engine-console engine-console--${selectedEngine.accent} self-start`}><div className="relative z-10"><p className="tech-label">Advisor / {selectedEngine.category}</p><h3 className="blueprint-headline mt-2 text-4xl">{selectedEngine.name}</h3><label className="tech-label mt-5 block" htmlFor="studio-brief">Project seed</label><Input id="studio-brief" value={projectBrief} onChange={(event) => setProjectBrief(event.target.value)} className="mt-2 border-cyan-950/10 bg-white/90" /><div className="mt-4 rounded-xl border border-cyan-950/8 bg-white/70 p-4"><p className="tech-label">Advisor brief</p><p className="mt-2 text-sm leading-relaxed text-slate-700">{prompts[promptIndex]}</p><div className="mt-3 flex items-center justify-between"><button className="nav-sector" type="button" onClick={() => setPromptIndex((promptIndex + 1) % prompts.length)}>Next angle</button><span className="tech-label">0{promptIndex + 1}/0{prompts.length}</span></div></div><Button className="btn-primary mt-4 w-full rounded-xl" onClick={() => handoff('/')}>Ask in Design & UI <ArrowUpRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" className="mt-2 w-full rounded-xl border-cyan-950/15 bg-white/65" onClick={() => handoff(routeFor(selectedEngine))}>Continue with {selectedEngine.workspace}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></aside></div>}
      </section>
    </section>
  </main>;
}
