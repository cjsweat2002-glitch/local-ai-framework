import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { trpc } from '@/lib/trpc';
import ConversationChat from '@/components/ConversationChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Activity, Bug, Eye, FileCode2, Gem, GitPullRequest, LockKeyhole, Orbit, Sparkles, WandSparkles } from 'lucide-react';
import {
  GEMINI_RESPONSE_FOCUSES,
  GEMINI_WORKBENCH_MODES,
  buildGeminiWorkbenchContext,
  getGeminiWorkbenchMode,
  getGeminiWorkbenchStarters,
  type GeminiResponseFocus,
  type GeminiWorkbenchMode,
} from '@/lib/geminiWorkbench';

type MirrorKind = 'gem-blueprint' | 'notebook-mirror';

export default function GeminiDeveloper() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const mirrors = trpc.geminiWorkspace.listMirrors.useQuery(undefined, { enabled: isAuthenticated });
  const createMirror = trpc.geminiWorkspace.createMirror.useMutation({
    onSuccess: async () => {
      await utils.geminiWorkspace.listMirrors.invalidate();
      setForm({ kind: 'gem-blueprint', name: '', instructions: '', notebookContent: '', sourceUrl: '' });
    },
  });
  const deleteMirror = trpc.geminiWorkspace.deleteMirror.useMutation({
    onSuccess: async () => {
      setSelectedMirrorId(null);
      await utils.geminiWorkspace.listMirrors.invalidate();
    },
  });
  const [selectedMirrorId, setSelectedMirrorId] = useState<number | null>(null);
  const [form, setForm] = useState({ kind: 'gem-blueprint' as MirrorKind, name: '', instructions: '', notebookContent: '', sourceUrl: '' });
  const [workMode, setWorkMode] = useState<GeminiWorkbenchMode>('build');
  const [responseFocus, setResponseFocus] = useState<GeminiResponseFocus>('implementation');
  const [projectIntent, setProjectIntent] = useState('Develop the next reviewable improvement for Autonomous AI Hub.');

  const selectedMirror = useMemo(() => (
    mirrors.data?.find((mirror) => mirror.id === selectedMirrorId) ?? mirrors.data?.[0]
  ), [mirrors.data, selectedMirrorId]);
  const developerContext = useMemo(() => buildGeminiWorkbenchContext({
    mode: workMode,
    responseFocus,
    projectIntent,
    mirrorName: selectedMirror?.name,
    mirrorContext: [selectedMirror?.instructions, selectedMirror?.notebookContent].filter(Boolean).join('\n\n'),
  }), [projectIntent, responseFocus, selectedMirror, workMode]);
  const activeMode = getGeminiWorkbenchMode(workMode);
  const starterPrompts = useMemo(() => getGeminiWorkbenchStarters(workMode, projectIntent), [projectIntent, workMode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Gemini Developer…</div>;
  if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-background p-6"><div className="max-w-md text-center"><h1 className="blueprint-headline text-5xl mb-4">Gemini Developer</h1><p className="text-muted-foreground mb-7">Sign in to keep your Gemini mirrors and developer conversation private.</p><Button className="btn-primary" onClick={startLogin}>Sign In with Manus</Button></div></div>;

  const submitMirror = (event: React.FormEvent) => {
    event.preventDefault();
    createMirror.mutate({
      kind: form.kind,
      name: form.name,
      instructions: form.instructions || undefined,
      notebookContent: form.notebookContent || undefined,
      sourceUrl: form.sourceUrl || undefined,
    });
  };

  return <main className="blueprint-page min-h-screen bg-background text-foreground">
    <header className="lab-topbar px-5 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="orbital-mark h-10 w-10"><Gem className="relative z-10 h-4 w-4" /></span><div><p className="tech-label text-[10px] text-cyan-700">Google Gemini / project workstation</p><h1 className="blueprint-headline mt-1 text-3xl">Gemini Developer</h1></div></div>
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Gemini Developer destinations"><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/design-studio')}>Design Studio</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/task-history')}>Task History</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/activity-pulse')}>Activity Pulse</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/system-factory')}>System Factory</Button><span className="hidden border-l border-slate-900/10 pl-3 text-xs text-muted-foreground xl:inline">{user?.name || user?.email}</span><Button variant="ghost" className="nav-sector hidden sm:inline-flex" onClick={logout}>Sign Out</Button></nav></div>
    </header>
    <section className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="branch-map gemini-workbench-rail border-r border-cyan-950/10 bg-white/74 p-5 space-y-5 overflow-y-auto backdrop-blur-xl">
        <div className="blueprint-panel blueprint-panel--glow rounded-2xl p-4"><div className="mb-3 flex items-center justify-between"><span className="signal-pill"><span className="signal-dot signal-dot--violet" />Project-aware route</span><Sparkles className="h-4 w-4 text-pink-400" /></div><h2 className="blueprint-headline text-3xl">Build with a<br />real project frame.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">A deeper Gemini workstation for code, interface changes, diagnosis, and governed proposals—without sharing production secrets.</p></div>
        <section className="gemini-control-deck" aria-labelledby="gemini-mode-heading"><div className="flex items-center justify-between gap-3"><div><p className="tech-label" id="gemini-mode-heading">Creation field</p><p className="mt-1 text-sm font-semibold text-slate-800">{activeMode.label} mode</p></div><WandSparkles className="h-4 w-4 text-violet-600" /></div><div className="gemini-mode-grid mt-3" role="tablist" aria-label="Gemini creation modes">{GEMINI_WORKBENCH_MODES.map((mode) => <button key={mode.id} type="button" role="tab" aria-selected={workMode === mode.id} className={workMode === mode.id ? 'gemini-mode gemini-mode--active' : 'gemini-mode'} onClick={() => setWorkMode(mode.id)}>{mode.label}</button>)}</div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{activeMode.description}</p><label className="gemini-field mt-4"><span>Project intent</span><Textarea value={projectIntent} onChange={(event) => setProjectIntent(event.target.value)} className="min-h-20" placeholder="Describe the active app change, question, or outcome." /></label><label className="gemini-field mt-3"><span>Response focus</span><select value={responseFocus} onChange={(event) => setResponseFocus(event.target.value as GeminiResponseFocus)}>{GEMINI_RESPONSE_FOCUSES.map((focus) => <option key={focus.id} value={focus.id}>{focus.label} — {focus.detail}</option>)}</select></label></section>
        <section className="gemini-signal-card" aria-label="Project preview and proposal signals"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Eye className="h-4 w-4 text-cyan-700" /><span className="tech-label">Preview surface</span></div><span className="signal-pill"><span className="signal-dot" />Ready</span></div><p className="mt-3 text-sm font-semibold text-slate-800">Context is connected, execution is review-led.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Use this workspace to shape and inspect changes. Activity Pulse tracks real task and proposal milestones; deployment stays outside the chat.</p><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" className="gemini-signal-action" onClick={() => setLocation('/activity-pulse')}><Activity className="h-3.5 w-3.5" />Pulse</Button><Button size="sm" variant="outline" className="gemini-signal-action" onClick={() => setLocation('/task-history')}><GitPullRequest className="h-3.5 w-3.5" />History</Button></div></section>
        <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/75 p-4 text-sm leading-relaxed text-cyan-950"><div className="mb-2 flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" />Private consumer mirror</div>Paste notebook content or Gem instructions you choose to share. This is private to your account, redacts recognized production assignments before context is used, and is not a live connection to Gemini consumer services.</div>
        <form className="space-y-3" onSubmit={submitMirror}>
          <label className="tech-label text-xs">MIRROR TYPE</label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as MirrorKind })}><option value="gem-blueprint">Gem blueprint</option><option value="notebook-mirror">Notebook mirror</option></select>
          <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={form.kind === 'gem-blueprint' ? 'Gem name' : 'Notebook title'} />
          <Textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Paste Gem instructions, coding conventions, or reusable expertise" className="min-h-24" />
          <Textarea value={form.notebookContent} onChange={(event) => setForm({ ...form, notebookContent: event.target.value })} placeholder="Paste notebook notes, sources, or generated research you want Gemini to use" className="min-h-28" />
          <Input value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="Original Gemini share URL (optional)" type="url" />
          {createMirror.error && <p className="text-sm text-red-700">{createMirror.error.message}</p>}
          <Button className="btn-primary w-full" disabled={createMirror.isPending}>{createMirror.isPending ? 'Saving mirror…' : 'Save private mirror'}</Button>
        </form>
        <div className="space-y-2"><div className="flex items-center justify-between"><p className="tech-label text-xs">Available mirrors</p><Orbit className="h-3.5 w-3.5 text-cyan-600" /></div>{mirrors.isLoading ? <p className="text-sm text-muted-foreground">Loading mirrors…</p> : mirrors.data?.length ? mirrors.data.map((mirror) => <div key={mirror.id} role="button" tabIndex={0} aria-pressed={selectedMirror?.id === mirror.id} onClick={() => setSelectedMirrorId(mirror.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedMirrorId(mirror.id); }} className={`w-full cursor-pointer rounded-xl border p-3.5 text-left transition ${selectedMirror?.id === mirror.id ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-900/10 bg-white/75 hover:border-cyan-400/60 hover:bg-white'}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{mirror.name}</span><span className="signal-pill px-2 py-1 text-[9px]">{mirror.kind === 'gem-blueprint' ? 'Gem' : 'Notebook'}</span></div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{mirror.instructions || mirror.notebookContent || 'Empty mirror'}</p><Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-red-700" disabled={deleteMirror.isPending} onClick={(event) => { event.stopPropagation(); deleteMirror.mutate({ mirrorId: mirror.id }); }}>Remove mirror</Button></div>) : <div className="rounded-xl border border-dashed border-cyan-500/30 bg-white/55 p-4 text-sm text-muted-foreground">No mirrors saved yet. Paste a Gem or notebook you want to carry into this development space.</div>}</div>
      </aside>
      <section className="gemini-workbench-main min-h-[calc(100vh-81px)]"><div className="gemini-workbench-band"><div className="gemini-workbench-band__identity"><FileCode2 className="h-4 w-4 text-cyan-700" /><div><p className="tech-label">Active project frame</p><p className="mt-1 text-sm font-semibold text-slate-800">{projectIntent || 'Set a project intent to guide the next response.'}</p></div></div><div className="gemini-workbench-band__signals"><span><Bug className="h-3.5 w-3.5" />Safe diagnosis</span><span><Gem className="h-3.5 w-3.5" />{selectedMirror ? selectedMirror.name : 'No mirror'}</span><span><GitPullRequest className="h-3.5 w-3.5" />Proposal-ready</span></div></div><div className="gemini-workbench-chat"><ConversationChat branch="Gemini Developer" forcedProvider="google-gemini" developerContext={developerContext} starterPrompts={starterPrompts} engineLabel={`Gemini workstation / ${activeMode.label}`} /></div></section>
    </section>
  </main>;
}
