import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const providerLabels: Record<string, string> = {
  manus: 'Manus',
  'built-in-forge': 'Built-in Forge',
  'google-gemini': 'Google Gemini',
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function SystemFactory() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const dashboard = trpc.governedSystem.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [parentForm, setParentForm] = useState({ name: 'Personal Development Parent', purpose: '', marketPosition: '' });
  const [childForm, setChildForm] = useState({ name: '', purpose: '', symbolicModel: '', capabilityModel: '', marketPosition: '' });
  const [signalForm, setSignalForm] = useState<{ provider: 'manus' | 'built-in-forge' | 'google-gemini'; category: 'capability' | 'deployment' | 'market' | 'interface' | 'safety'; title: string; summary: string; sourceUrl: string; relevanceScore: number }>({ provider: 'google-gemini', category: 'capability', title: '', summary: '', sourceUrl: '', relevanceScore: 70 });
  const [exchangeForm, setExchangeForm] = useState<{ exchangeType: 'signal' | 'capability' | 'purpose' | 'reflection'; title: string; payload: string; integrityScore: number }>({ exchangeType: 'reflection', title: '', payload: '', integrityScore: 70 });

  const nodes = dashboard.data?.nodes ?? [];
  const parents = useMemo(() => nodes.filter((node) => node.kind === 'parent'), [nodes]);
  const children = useMemo(() => nodes.filter((node) => node.kind === 'child'), [nodes]);
  const selectedChild = children.find((child) => child.id === selectedChildId) ?? children[0];

  useEffect(() => {
    if (!selectedChildId && children[0]) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  const invalidate = () => utils.governedSystem.dashboard.invalidate();
  const createNode = trpc.governedSystem.createNode.useMutation({ onSuccess: invalidate });
  const addSignal = trpc.governedSystem.addMarketSignal.useMutation({ onSuccess: invalidate });
  const createExchange = trpc.governedSystem.createExchange.useMutation({ onSuccess: invalidate });
  const reviewChild = trpc.governedSystem.reviewChild.useMutation({ onSuccess: invalidate });
  const resolveProposal = trpc.governedSystem.resolveProposal.useMutation({ onSuccess: invalidate });
  const setWatcherConsent = trpc.governedSystem.setWatcherConsent.useMutation({ onSuccess: invalidate });

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading system factory…</div>;
  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-6"><div className="max-w-md text-center"><h1 className="blueprint-headline text-5xl mb-4">System Factory</h1><p className="text-muted-foreground mb-7">Sign in to keep parent–child development records private and auditable.</p><Button onClick={startLogin} className="btn-primary">Sign In with Manus</Button></div></div>;
  }

  const parent = parents[0];
  const proposals = dashboard.data?.proposals ?? [];
  const signals = dashboard.data?.signals ?? [];
  const exchanges = dashboard.data?.exchanges ?? [];

  const submitParent = (event: React.FormEvent) => {
    event.preventDefault();
    createNode.mutate({ kind: 'parent', ...parentForm }, { onSuccess: () => setFactoryError(null), onError: (error) => setFactoryError(error.message) });
  };
  const submitChild = (event: React.FormEvent) => {
    event.preventDefault();
    if (!parent) return;
    createNode.mutate({ kind: 'child', parentId: parent.id, ...childForm }, { onSuccess: () => { setFactoryError(null); setChildForm({ name: '', purpose: '', symbolicModel: '', capabilityModel: '', marketPosition: '' }); }, onError: (error) => setFactoryError(error.message) });
  };
  const submitSignal = (event: React.FormEvent) => {
    event.preventDefault();
    addSignal.mutate({ ...signalForm, sourceUrl: signalForm.sourceUrl || undefined }, { onSuccess: () => { setFactoryError(null); setSignalForm({ provider: 'google-gemini', category: 'capability', title: '', summary: '', sourceUrl: '', relevanceScore: 70 }); }, onError: (error) => setFactoryError(error.message) });
  };
  const submitExchange = (event: React.FormEvent) => {
    event.preventDefault();
    if (!parent || !selectedChild) return;
    createExchange.mutate({ parentNodeId: parent.id, childNodeId: selectedChild.id, ...exchangeForm }, { onSuccess: () => { setFactoryError(null); setExchangeForm({ exchangeType: 'reflection', title: '', payload: '', integrityScore: 70 }); }, onError: (error) => setFactoryError(error.message) });
  };
  const runReview = () => {
    if (!selectedChild) return;
    reviewChild.mutate({ childNodeId: selectedChild.id }, { onSuccess: () => setFactoryError(null), onError: (error) => setFactoryError(error.message) });
  };
  const decideProposal = (proposalId: number, decision: 'approved' | 'rejected') => {
    resolveProposal.mutate({ proposalId, decision }, { onSuccess: () => setFactoryError(null), onError: (error) => setFactoryError(error.message) });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-5 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="tech-label text-xs text-primary">GOVERNED / HUMAN-APPROVED</p><h1 className="blueprint-headline text-3xl">System Factory</h1></div>
        <div className="flex items-center gap-2"><Button variant="ghost" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" onClick={() => setLocation('/task-history')}>Task History</Button><span className="hidden sm:inline text-sm text-muted-foreground">{user?.name || user?.email}</span><Button variant="ghost" onClick={logout}>Sign Out</Button></div>
      </header>

      <section className="max-w-7xl mx-auto p-5 sm:p-8 space-y-6">
        {factoryError && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">Governed action was not applied: {factoryError}</div>}
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Parent systems" value={parents.length} detail="Owns purpose and boundaries" />
          <Metric label="Child systems" value={children.length} detail="Proposal-only development" />
          <Metric label="Open proposals" value={proposals.filter((proposal) => proposal.status === 'proposed').length} detail="No automatic application" />
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
          <div className="space-y-6">
            <Panel title="Parent architecture" subtitle="Define the governing system before creating its children.">
              {!parent ? <form className="space-y-3" onSubmit={submitParent}>
                <Input value={parentForm.name} onChange={(event) => setParentForm({ ...parentForm, name: event.target.value })} placeholder="Parent system name" required />
                <Textarea value={parentForm.purpose} onChange={(event) => setParentForm({ ...parentForm, purpose: event.target.value })} placeholder="Parent purpose and non-negotiable boundaries" required />
                <Textarea value={parentForm.marketPosition} onChange={(event) => setParentForm({ ...parentForm, marketPosition: event.target.value })} placeholder="Market distinction to protect" />
                <Button className="btn-primary w-full" disabled={createNode.isPending}>Create governed parent</Button>
              </form> : <div className="space-y-3"><div className="flex flex-wrap gap-2"><Badge className="bg-cyan-100 text-cyan-900">proposal-only autonomy</Badge><Badge className={parent.watcherConsent ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'}>watcher consent {parent.watcherConsent ? 'enabled' : 'disabled'}</Badge></div><h2 className="font-semibold text-xl">{parent.name}</h2><p className="text-sm text-muted-foreground whitespace-pre-wrap">{parent.purpose}</p><p className="tech-label text-xs">MARKET POSITION</p><p className="text-sm">{parent.marketPosition || 'No market position recorded yet.'}</p><Button size="sm" variant={parent.watcherConsent ? 'outline' : 'default'} className={!parent.watcherConsent ? 'btn-primary' : ''} disabled={setWatcherConsent.isPending} onClick={() => setWatcherConsent.mutate({ parentNodeId: parent.id, enabled: !parent.watcherConsent }, { onSuccess: () => setFactoryError(null), onError: (error) => setFactoryError(error.message) })}>{parent.watcherConsent ? 'Disable watcher reviews' : 'Enable manual watcher reviews'}</Button></div>}
            </Panel>

            <Panel title="Child development unit" subtitle="Children inherit the parent boundary and can only propose change.">
              {!parent ? <p className="text-sm text-muted-foreground">Create the parent system first.</p> : <form className="space-y-3" onSubmit={submitChild}>
                <Input value={childForm.name} onChange={(event) => setChildForm({ ...childForm, name: event.target.value })} placeholder="Child system name" required />
                <Textarea value={childForm.purpose} onChange={(event) => setChildForm({ ...childForm, purpose: event.target.value })} placeholder="Personal development purpose" required />
                <Textarea value={childForm.symbolicModel} onChange={(event) => setChildForm({ ...childForm, symbolicModel: event.target.value })} placeholder="Symbolic language / interface vocabulary" />
                <Textarea value={childForm.capabilityModel} onChange={(event) => setChildForm({ ...childForm, capabilityModel: event.target.value })} placeholder="Factory functions / capability relationships" />
                <Input value={childForm.marketPosition} onChange={(event) => setChildForm({ ...childForm, marketPosition: event.target.value })} placeholder="Differentiated market position" />
                <Button className="btn-primary w-full" disabled={createNode.isPending}>Create child unit</Button>
              </form>}
            </Panel>

            <Panel title="Child registry" subtitle="Isolated units connected only through versioned exchanges.">
              <div className="space-y-2">{children.length === 0 ? <p className="text-sm text-muted-foreground">No child systems yet.</p> : children.map((child) => <button key={child.id} onClick={() => setSelectedChildId(child.id)} className={`w-full text-left rounded-lg border p-3 transition ${selectedChild?.id === child.id ? 'border-primary bg-cyan-50' : 'border-border bg-card hover:border-primary/40'}`}><div className="flex justify-between gap-3"><span className="font-medium">{child.name}</span><Badge variant="outline">child</Badge></div><p className="text-sm text-muted-foreground line-clamp-2 mt-1">{child.purpose}</p></button>)}</div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Provider market signals" subtitle="Log observed market changes with a source; signals do not trigger external actions.">
              <form className="grid gap-3 md:grid-cols-2" onSubmit={submitSignal}>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={signalForm.provider} onChange={(event) => setSignalForm({ ...signalForm, provider: event.target.value as typeof signalForm.provider })}><option value="manus">Manus</option><option value="built-in-forge">Built-in Forge</option><option value="google-gemini">Google Gemini</option></select>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={signalForm.category} onChange={(event) => setSignalForm({ ...signalForm, category: event.target.value as typeof signalForm.category })}><option value="capability">Capability</option><option value="deployment">Deployment</option><option value="market">Market</option><option value="interface">Interface</option><option value="safety">Safety</option></select>
                <Input className="md:col-span-2" value={signalForm.title} onChange={(event) => setSignalForm({ ...signalForm, title: event.target.value })} placeholder="Observed change or competitive signal" required />
                <Textarea className="md:col-span-2" value={signalForm.summary} onChange={(event) => setSignalForm({ ...signalForm, summary: event.target.value })} placeholder="Evidence-led summary" required />
                <Input value={signalForm.sourceUrl} onChange={(event) => setSignalForm({ ...signalForm, sourceUrl: event.target.value })} placeholder="Source URL (optional)" />
                <label className="flex items-center gap-2 text-sm">Relevance <input className="w-full" type="range" min="1" max="100" value={signalForm.relevanceScore} onChange={(event) => setSignalForm({ ...signalForm, relevanceScore: Number(event.target.value) })} />{signalForm.relevanceScore}</label>
                <Button className="md:col-span-2 btn-primary" disabled={addSignal.isPending}>Log market signal</Button>
              </form>
              <div className="mt-5 space-y-2">{signals.slice(0, 5).map((signal) => <div key={signal.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{signal.title}</span><Badge variant="outline">{providerLabels[signal.provider] || signal.provider}</Badge></div><p className="text-sm text-muted-foreground mt-1">{signal.summary}</p></div>)}</div>
            </Panel>

            <Panel title="Tensor exchange folder" subtitle="Every parent–child message is versioned and separated by a deterministic folder key.">
              {!parent || !selectedChild ? <p className="text-sm text-muted-foreground">Create and select a child unit to open its exchange folder.</p> : <><div className="mb-4 rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-200">tensor/parent-{parent.id}/child-{selectedChild.id} / versioned ledger</div><form className="grid gap-3" onSubmit={submitExchange}><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={exchangeForm.exchangeType} onChange={(event) => setExchangeForm({ ...exchangeForm, exchangeType: event.target.value as typeof exchangeForm.exchangeType })}><option value="reflection">Reflection</option><option value="signal">Signal</option><option value="capability">Capability</option><option value="purpose">Purpose</option></select><Input value={exchangeForm.title} onChange={(event) => setExchangeForm({ ...exchangeForm, title: event.target.value })} placeholder="Exchange title" required /><Textarea value={exchangeForm.payload} onChange={(event) => setExchangeForm({ ...exchangeForm, payload: event.target.value })} placeholder="Structured insight, interface language, or factory relationship" required /><label className="flex items-center gap-2 text-sm">Integrity <input className="w-full" type="range" min="0" max="100" value={exchangeForm.integrityScore} onChange={(event) => setExchangeForm({ ...exchangeForm, integrityScore: clampScore(Number(event.target.value)) })} />{exchangeForm.integrityScore}</label><Button className="btn-primary" disabled={createExchange.isPending}>Write versioned exchange</Button></form></>}
              <div className="mt-5 space-y-2">{exchanges.filter((exchange) => !selectedChild || exchange.childNodeId === selectedChild.id).slice(0, 6).map((exchange) => <div key={exchange.id} className="rounded-md border border-border p-3"><div className="flex justify-between gap-3"><span className="font-medium text-sm">{exchange.title}</span><span className="tech-label text-xs">v{exchange.version}</span></div><p className="font-mono text-xs text-primary mt-1">{exchange.folderKey}</p><p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exchange.payload}</p></div>)}</div>
            </Panel>

            <Panel title="Integrity watcher" subtitle="Manual review creates one low-noise proposal. Nothing applies without your explicit approval.">
              {!selectedChild || !parent ? <p className="text-sm text-muted-foreground">Select a child unit to run a bounded review.</p> : !parent.watcherConsent ? <p className="text-sm text-muted-foreground">Enable manual watcher reviews on the parent before proposing a development change.</p> : <Button className="btn-primary" disabled={reviewChild.isPending} onClick={runReview}>Review {selectedChild.name}</Button>}
              <div className="mt-4 space-y-3">{proposals.map((proposal) => <div key={proposal.id} className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{proposal.title}</span><Badge className={proposal.status === 'proposed' ? 'bg-amber-100 text-amber-900' : proposal.status === 'approved' ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'}>{proposal.status}</Badge></div><p className="text-sm text-muted-foreground mt-2">{proposal.rationale}</p><p className="text-sm mt-2 whitespace-pre-wrap">{proposal.proposedPurpose}</p><div className="mt-3 flex gap-3 text-xs"><span>Integrity {proposal.integrityScore}</span><span>Noise {proposal.noiseScore}</span></div>{proposal.status === 'proposed' && <div className="mt-3 flex gap-2"><Button size="sm" className="btn-primary" onClick={() => decideProposal(proposal.id, 'approved')}>Approve & apply</Button><Button size="sm" variant="outline" onClick={() => decideProposal(proposal.id, 'rejected')}>Reject</Button></div>}</div>)}</div>
            </Panel>
          </div>
        </section>

        <Panel title="Update stream history" subtitle="Audit records preserve provenance for every node, market signal, exchange, proposal, and approval.">
          <div className="grid gap-2 md:grid-cols-2">{(dashboard.data?.auditEvents ?? []).map((event) => <div key={event.id} className="rounded border border-border px-3 py-2"><p className="tech-label text-xs">{event.action} · {new Date(event.createdAt).toLocaleString()}</p><p className="text-sm mt-1">{event.detail}</p></div>)}</div>
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-border bg-card p-5 wireframe-border"><p className="tech-label text-xs">{label}</p><p className="blueprint-headline text-4xl mt-2">{value}</p><p className="text-sm text-muted-foreground mt-1">{detail}</p></div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5 wireframe-border"><div className="mb-4"><h2 className="blueprint-headline text-xl">{title}</h2><p className="tech-label text-xs mt-1">{subtitle}</p></div>{children}</section>;
}
