import React, { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import BranchSidebar from '@/components/BranchSidebar';
import ConversationChat from '@/components/ConversationChat';
import { Button } from '@/components/ui/button';
import { Orbit, Sparkles } from 'lucide-react';
import { BRANCHES } from '../../../drizzle/schema';
import { startLogin } from '@/const';

type DesignStudioHandoff = { engineName: string; prompt: string; prompts: string[] };

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBranch, setSelectedBranch] = useState<typeof BRANCHES[number]>('Code Generation');
  const [designHandoff, setDesignHandoff] = useState<DesignStudioHandoff | null>(null);

  useEffect(() => {
    const rawHandoff = sessionStorage.getItem('designStudioHandoff');
    if (!rawHandoff) return;
    try {
      const handoff = JSON.parse(rawHandoff) as DesignStudioHandoff;
      if (handoff.engineName && handoff.prompt && Array.isArray(handoff.prompts)) {
        setSelectedBranch('Design & UI');
        setDesignHandoff(handoff);
      }
    } finally {
      sessionStorage.removeItem('designStudioHandoff');
    }
  }, []);

  const selectBranch = (branch: typeof BRANCHES[number]) => {
    setSelectedBranch(branch);
    setDesignHandoff(null);
  };

  if (loading) {
    return (
      <div className="blueprint-page min-h-screen bg-background flex items-center justify-center p-6">
        <div className="blueprint-panel blueprint-panel--glow rounded-2xl px-8 py-9 text-center">
          <div className="orbital-mark mx-auto mb-5"><Orbit className="relative z-10 h-5 w-5" /></div>
          <p className="tech-label">Calibrating workspace</p>
          <p className="mt-2 text-sm text-muted-foreground">Aligning branches and active signals…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="blueprint-page min-h-screen bg-background flex items-center justify-center p-6">
        <div className="blueprint-panel blueprint-panel--glow max-w-xl rounded-3xl px-8 py-11 text-center sm:px-14">
          <div className="orbital-mark mx-auto mb-6 h-14 w-14"><Orbit className="relative z-10 h-6 w-6" /></div>
          <p className="tech-label mb-3 text-cyan-700">Conversational operating system</p>
          <h1 className="blueprint-headline text-5xl sm:text-6xl">Make the next<br />move visible.</h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Enter a branching workspace for code, research, design, autonomous systems, and the ideas connecting them.</p>
          <div className="my-8 flex flex-wrap justify-center gap-2"><span className="signal-pill"><span className="signal-dot" />Persistent memory</span><span className="signal-pill"><span className="signal-dot signal-dot--pink" />Live streams</span><span className="signal-pill"><span className="signal-dot signal-dot--violet" />Governed systems</span></div>
          <Button
            onClick={startLogin}
            className="btn-primary h-12 rounded-xl px-8"
          >
            <Sparkles className="mr-2 h-4 w-4" />Open the workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="blueprint-page flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <BranchSidebar selectedBranch={selectedBranch} onSelectBranch={selectBranch} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="lab-topbar flex items-center justify-between gap-4 px-5 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="signal-pill workspace-live-pill shrink-0"><span className="signal-dot" />Workspace live</span>
            <div className="hidden min-w-0 sm:block">
              <p className="tech-label text-[10px]">Active exploration path</p>
              <p className="truncate text-sm font-semibold text-slate-700">{selectedBranch}</p>
            </div>
          </div>
          <nav className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto" aria-label="Workspace destinations">
            <Button
              onClick={() => setLocation('/design-studio')}
              variant="ghost"
              className="nav-sector"
            >
              Design Studio
            </Button>
            <Button
              onClick={() => setLocation('/task-history')}
              variant="ghost"
              className="nav-sector"
            >
              Task History
            </Button>
            <Button
              onClick={() => setLocation('/system-factory')}
              variant="ghost"
              className="nav-sector"
            >
              System Factory
            </Button>
            <Button
              onClick={() => setLocation('/gemini-developer')}
              variant="ghost"
              className="nav-sector"
            >
              Gemini Dev
            </Button>
            <div className="hidden border-l border-slate-900/10 pl-3 text-xs text-muted-foreground xl:block">{user?.name || user?.email}</div>
            <Button
              onClick={logout}
              variant="ghost"
              className="nav-sector hidden sm:inline-flex"
            >
              Sign Out
            </Button>
          </nav>
        </header>

        {/* Chat Area */}
        <ConversationChat branch={selectedBranch} starterPrompts={designHandoff?.prompts} initialPrompt={designHandoff?.prompt} engineLabel={designHandoff?.engineName} />
      </div>
    </div>
  );
}
