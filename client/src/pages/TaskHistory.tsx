import React from 'react';
import { trpc } from '@/lib/trpc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { providerLabel } from '@/lib/providerLabels';
import { ArrowUpRight, Archive, Orbit, Sparkles } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  queued: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function TaskHistory() {
  const [, setLocation] = useLocation();
  const { data: tasks, isLoading } = trpc.task.list.useQuery();
  const taskCount = tasks?.length || 0;

  return (
    <main className="blueprint-page min-h-screen bg-background text-foreground">
      <header className="lab-topbar px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="orbital-mark h-10 w-10"><Archive className="relative z-10 h-4 w-4" /></span><div><p className="tech-label text-[10px] text-cyan-700">Archive / execution memory</p><h1 className="blueprint-headline mt-1 text-3xl">Task History</h1></div></div>
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Task history destinations"><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/design-studio')}>Design Studio</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/system-factory')}>System Factory</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/gemini-developer')}>Gemini Dev</Button></nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <div className="mission-deck blueprint-panel--glow mb-6 rounded-2xl p-6 sm:p-8">
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="signal-pill"><span className="signal-dot signal-dot--violet" />Execution archive</span><span className="tech-label">{taskCount} recorded missions</span></div><h2 className="blueprint-headline text-4xl sm:text-5xl">Every prompt leaves<br />a trace to revisit.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Follow your completed streams, current work, providers, and the ideas that led to each outcome.</p></div><div className="blueprint-panel rounded-xl px-5 py-4 text-right"><p className="tech-label">Archive depth</p><p className="blueprint-headline mt-1 text-4xl">{taskCount}</p><p className="mt-1 text-xs text-muted-foreground">tasks retained</p></div></div>
        </div>

        <div className="blueprint-panel overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="orbital-mark mb-4"><Orbit className="relative z-10 h-4 w-4" /></span><p className="tech-label">Retrieving execution trail</p><p className="mt-2 text-sm text-muted-foreground">Loading your retained task signals…</p></div>
          ) : tasks && tasks.length > 0 ? (
            <div className="overflow-x-auto"><Table><TableHeader className="bg-cyan-50/55"><TableRow className="hover:bg-transparent"><TableHead className="tech-label text-[10px]">Branch</TableHead><TableHead className="tech-label text-[10px]">Provider</TableHead><TableHead className="tech-label text-[10px]">Agent profile</TableHead><TableHead className="tech-label text-[10px]">Status</TableHead><TableHead className="tech-label text-[10px]">Created</TableHead><TableHead className="tech-label text-[10px]">Output preview</TableHead></TableRow></TableHeader><TableBody>{tasks.map(task => (<TableRow key={task.id} className="group border-slate-900/6 transition-colors hover:bg-cyan-50/35"><TableCell className="font-semibold text-slate-800"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400 group-hover:bg-pink-400" />{task.branch}</div></TableCell><TableCell className="text-sm text-slate-600">{providerLabel(task.provider)}</TableCell><TableCell><span className="signal-pill px-2 py-1 text-[9px]">{task.agentProfile}</span></TableCell><TableCell><Badge className={`border shadow-none ${STATUS_COLORS[task.status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{task.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</TableCell><TableCell className="max-w-xs truncate text-sm text-slate-600">{task.output || '—'}</TableCell></TableRow>))}</TableBody></Table></div>
          ) : (
            <div className="flex min-h-80 items-center justify-center p-6"><div className="empty-orbit text-center"><Sparkles className="mx-auto h-7 w-7 text-pink-400" /><p className="blueprint-headline mt-4 text-3xl">No trail yet.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Your first conversation will become the first visible point in this execution archive.</p><Button onClick={() => setLocation('/')} className="btn-primary mt-6 rounded-xl px-5">Start exploring <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></div>
          )}
        </div>
      </section>
    </main>
  );
}
