import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { trpc } from '@/lib/trpc';
import ConversationChat from '@/components/ConversationChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Gem, LockKeyhole, Orbit, Sparkles } from 'lucide-react';

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

  const selectedMirror = useMemo(() => (
    mirrors.data?.find((mirror) => mirror.id === selectedMirrorId) ?? mirrors.data?.[0]
  ), [mirrors.data, selectedMirrorId]);
  const developerContext = useMemo(() => {
    if (!selectedMirror) return undefined;
    const sections = [
      `Mirror name: ${selectedMirror.name}`,
      selectedMirror.instructions ? `Gem instructions:\n${selectedMirror.instructions}` : '',
      selectedMirror.notebookContent ? `Notebook content:\n${selectedMirror.notebookContent}` : '',
    ].filter(Boolean);
    return sections.join('\n\n');
  }, [selectedMirror]);

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
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="orbital-mark h-10 w-10"><Gem className="relative z-10 h-4 w-4" /></span><div><p className="tech-label text-[10px] text-cyan-700">Google Gemini / developer branch</p><h1 className="blueprint-headline mt-1 text-3xl">Gemini Developer</h1></div></div>
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Gemini Developer destinations"><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/design-studio')}>Design Studio</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/task-history')}>Task History</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/system-factory')}>System Factory</Button><span className="hidden border-l border-slate-900/10 pl-3 text-xs text-muted-foreground xl:inline">{user?.name || user?.email}</span><Button variant="ghost" className="nav-sector hidden sm:inline-flex" onClick={logout}>Sign Out</Button></nav></div>
    </header>
    <section className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="branch-map border-r border-cyan-950/10 bg-white/74 p-5 space-y-5 overflow-y-auto backdrop-blur-xl">
        <div className="blueprint-panel blueprint-panel--glow rounded-2xl p-4"><div className="mb-3 flex items-center justify-between"><span className="signal-pill"><span className="signal-dot signal-dot--violet" />Locked route</span><Sparkles className="h-4 w-4 text-pink-400" /></div><h2 className="blueprint-headline text-3xl">Code with a<br />private context.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Gemini is locked for streamed code generation, interface design, debugging, and implementation planning.</p></div>
        <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/75 p-4 text-sm leading-relaxed text-cyan-950"><div className="mb-2 flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" />Private consumer mirror</div>Paste notebook content or Gem instructions you choose to share. This is private to your account and provides context here; it is not a live connection to Gemini consumer services.</div>
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
      <section className="min-h-[calc(100vh-81px)]"><ConversationChat branch="Gemini Developer" forcedProvider="google-gemini" developerContext={developerContext} /></section>
    </section>
  </main>;
}
