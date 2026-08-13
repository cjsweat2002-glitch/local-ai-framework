import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { trpc } from '@/lib/trpc';
import ConversationChat from '@/components/ConversationChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card px-5 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-4">
      <div><p className="tech-label text-xs text-primary">GOOGLE GEMINI / DEVELOPER BRANCH</p><h1 className="blueprint-headline text-3xl">Gemini Developer</h1></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="ghost" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" onClick={() => setLocation('/task-history')}>Task History</Button><Button variant="ghost" onClick={() => setLocation('/system-factory')}>System Factory</Button><span className="hidden sm:inline text-sm text-muted-foreground">{user?.name || user?.email}</span><Button variant="ghost" onClick={logout}>Sign Out</Button></div>
    </header>
    <section className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="border-r border-border bg-card p-5 space-y-5 overflow-y-auto">
        <div><p className="tech-label text-xs text-primary">DIRECT BUILD INTERFACE</p><h2 className="blueprint-headline text-2xl mt-1">Code & web development</h2><p className="mt-2 text-sm text-muted-foreground">Gemini is locked as the provider for streamed code generation, component design, debugging, and implementation planning.</p></div>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950"><strong>Consumer Gemini mirror.</strong> Paste notebook content or Gem instructions that you choose to share. The mirror is private to your account and is used only as context for this workspace; it is not a live connection to the Gemini consumer app.</div>
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
        <div className="space-y-2"><p className="tech-label text-xs">AVAILABLE MIRRORS</p>{mirrors.isLoading ? <p className="text-sm text-muted-foreground">Loading mirrors…</p> : mirrors.data?.length ? mirrors.data.map((mirror) => <div key={mirror.id} role="button" tabIndex={0} onClick={() => setSelectedMirrorId(mirror.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedMirrorId(mirror.id); }} className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${selectedMirror?.id === mirror.id ? 'border-primary bg-cyan-50' : 'border-border bg-background hover:border-primary/50'}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{mirror.name}</span><span className="tech-label text-[10px]">{mirror.kind === 'gem-blueprint' ? 'GEM' : 'NOTEBOOK'}</span></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{mirror.instructions || mirror.notebookContent || 'Empty mirror'}</p><Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-red-700" disabled={deleteMirror.isPending} onClick={(event) => { event.stopPropagation(); deleteMirror.mutate({ mirrorId: mirror.id }); }}>Remove mirror</Button></div>) : <p className="text-sm text-muted-foreground">No mirrors saved yet. Paste a Gem or notebook you want to use as developer context.</p>}</div>
      </aside>
      <section className="min-h-[calc(100vh-81px)]"><ConversationChat branch="Gemini Developer" forcedProvider="google-gemini" developerContext={developerContext} /></section>
    </section>
  </main>;
}
