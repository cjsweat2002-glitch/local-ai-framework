import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { BellRing, CircleAlert, CircleCheck, Clock3, Radio, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { startLogin } from '@/const';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { ACTIVITY_KIND_LABELS, ACTIVITY_PULSE_POLL_INTERVAL_MS, type ActivityKind } from '@/lib/activityPulse';

function activityIcon(level: string) {
  if (level === 'success') return <CircleCheck className="h-4 w-4 text-emerald-600" />;
  if (level === 'warning') return <CircleAlert className="h-4 w-4 text-amber-600" />;
  return <Radio className="h-4 w-4 text-cyan-600" />;
}

export default function ActivityPulse() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<ActivityKind>('development');
  const [level, setLevel] = useState<'info' | 'success' | 'warning'>('info');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const knownIds = useRef<Set<number>>(new Set());
  const hasLoaded = useRef(false);
  const { data: activities, isLoading, dataUpdatedAt } = trpc.activityPulse.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: ACTIVITY_PULSE_POLL_INTERVAL_MS,
  });
  const record = trpc.activityPulse.record.useMutation({
    onSuccess: async () => {
      setTitle('');
      setDetail('');
      await utils.activityPulse.list.invalidate();
    },
  });

  useEffect(() => {
    if (!activities) return;
    const ids = new Set(activities.map((activity) => activity.id));
    if (hasLoaded.current) {
      activities.filter((activity) => !knownIds.current.has(activity.id)).forEach((activity) => {
        toast(activity.title, { description: activity.detail, icon: activityIcon(activity.level) });
      });
    }
    knownIds.current = ids;
    hasLoaded.current = true;
  }, [activities, dataUpdatedAt]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !detail.trim()) return;
    record.mutate({ kind, level, title: title.trim(), detail: detail.trim(), source: 'activity-pulse' });
  };

  if (loading) return <main className="blueprint-page flex min-h-screen items-center justify-center bg-background p-6"><div className="blueprint-panel rounded-2xl p-8 text-center"><Radio className="mx-auto h-5 w-5 text-cyan-600" /><p className="tech-label mt-4">Establishing the activity signal</p></div></main>;
  if (!isAuthenticated) return <main className="blueprint-page flex min-h-screen items-center justify-center bg-background p-6"><div className="blueprint-panel blueprint-panel--glow max-w-xl rounded-3xl p-10 text-center"><BellRing className="mx-auto h-7 w-7 text-cyan-600" /><p className="tech-label mt-5 text-cyan-700">Development activity pulse</p><h1 className="blueprint-headline mt-3 text-5xl">Keep the work<br />in view.</h1><p className="mt-5 text-sm leading-relaxed text-muted-foreground">Sign in to retain owner-private development updates and receive in-site pings while this page is open.</p><Button onClick={startLogin} className="btn-primary mt-7 rounded-xl px-6">Open Activity Pulse <Sparkles className="ml-2 h-4 w-4" /></Button></div></main>;

  return <main className="blueprint-page min-h-screen bg-background text-foreground">
    <header className="lab-topbar px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="orbital-mark h-10 w-10"><BellRing className="relative z-10 h-4 w-4" /></span><div><p className="tech-label text-[10px] text-cyan-700">Cloud retained / browser-live</p><h1 className="blueprint-headline mt-1 text-3xl">Activity Pulse</h1></div></div><nav className="flex flex-wrap items-center gap-1.5" aria-label="Activity Pulse destinations"><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/')}>Workspace</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/design-studio')}>Design Studio</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/task-history')}>Task History</Button><Button variant="ghost" className="nav-sector" onClick={() => setLocation('/system-factory')}>System Factory</Button><span className="hidden border-l border-slate-900/10 pl-3 text-xs text-muted-foreground xl:inline">{user?.name || user?.email}</span><Button variant="ghost" className="nav-sector hidden sm:inline-flex" onClick={logout}>Sign Out</Button></nav></div></header>

    <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
      <div className="mission-deck blueprint-panel--glow mb-6 rounded-2xl p-6 sm:p-8"><div className="relative z-10 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="signal-pill"><span className="signal-dot" />Live while open</span><span className="tech-label">{ACTIVITY_PULSE_POLL_INTERVAL_MS / 1000}-second cloud refresh</span></div><h2 className="blueprint-headline text-4xl sm:text-5xl">A signal trail for<br />the work in motion.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">This no-cost pulse keeps retained activity records in your authenticated workspace and checks for new entries only while this page is open. It does not depend on an always-running worker.</p></div><div className="blueprint-panel rounded-xl px-5 py-4 text-right"><p className="tech-label">Retained events</p><p className="blueprint-headline mt-1 text-4xl">{activities?.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">owner-private signals</p></div></div></div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="blueprint-panel rounded-2xl p-5 sm:p-6" aria-label="Development activity stream"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="tech-label">Signal stream</p><h2 className="blueprint-headline mt-1 text-3xl">Updates that persist.</h2></div><span className="signal-pill"><Clock3 className="h-3 w-3" />Open-page pings</span></div>{isLoading ? <div className="py-16 text-center"><Radio className="mx-auto h-5 w-5 animate-pulse text-cyan-600" /><p className="tech-label mt-4">Listening for your activity signal</p></div> : activities && activities.length > 0 ? <ol className="space-y-3">{activities.map((activity) => <li key={activity.id} className="rounded-xl border border-slate-900/8 bg-white/65 p-4"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">{activityIcon(activity.level)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="tech-label text-[9px]">{ACTIVITY_KIND_LABELS[activity.kind as ActivityKind] || activity.kind}</span><span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</span></div><span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{activity.source}</span></div><h3 className="mt-2 text-sm font-semibold text-slate-800">{activity.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{activity.detail}</p></div></div></li>)}</ol> : <div className="empty-orbit py-16 text-center"><BellRing className="mx-auto h-7 w-7 text-pink-400" /><p className="blueprint-headline mt-4 text-3xl">The line is clear.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Add your first update below. Future task and interface events will appear here as they are recorded.</p></div>}</section>

        <aside className="blueprint-panel self-start rounded-2xl p-5 sm:p-6"><p className="tech-label">Record an update</p><h2 className="blueprint-headline mt-1 text-3xl">Leave a clear signal.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use this for decisions, local development milestones, interface notes, or watch items.</p><form className="mt-5 space-y-4" onSubmit={submit}><div className="grid grid-cols-2 gap-3"><label className="tech-label text-[10px]">Type<select className="mt-2 h-10 w-full rounded-lg border border-slate-900/10 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800" value={kind} onChange={(event) => setKind(event.target.value as ActivityKind)}>{Object.entries(ACTIVITY_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="tech-label text-[10px]">Signal<select className="mt-2 h-10 w-full rounded-lg border border-slate-900/10 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-800" value={level} onChange={(event) => setLevel(event.target.value as 'info' | 'success' | 'warning')}><option value="info">Info</option><option value="success">Success</option><option value="warning">Watch item</option></select></label></div><label className="tech-label text-[10px]">Headline<Input className="mt-2 border-slate-900/10 bg-white" value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder="What changed?" /></label><label className="tech-label text-[10px]">Context<Textarea className="mt-2 min-h-28 border-slate-900/10 bg-white" value={detail} maxLength={4000} onChange={(event) => setDetail(event.target.value)} placeholder="Describe the decision, local progress, or detail to retain…" /></label>{record.error && <p className="text-sm text-rose-600">{record.error.message}</p>}<Button type="submit" className="btn-primary w-full rounded-xl" disabled={record.isPending || title.trim().length < 3 || detail.trim().length < 3}>{record.isPending ? 'Recording…' : 'Record activity'} <Send className="ml-2 h-4 w-4" /></Button></form></aside>
      </div>
    </section>
  </main>;
}
