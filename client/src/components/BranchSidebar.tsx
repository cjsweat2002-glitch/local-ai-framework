import React from 'react';
import { ChartNoAxesCombined, Code2, Orbit, Palette, PenLine, Search, Sparkles, Workflow } from 'lucide-react';
import { BRANCHES } from '../../../drizzle/schema';
import { Button } from './ui/button';

const BRANCH_META: Record<typeof BRANCHES[number], { icon: typeof Code2; caption: string; accent: string; marker: string }> = {
  'Code Generation': { icon: Code2, caption: 'Write & refactor', accent: '01', marker: 'code' },
  'Content Creation': { icon: PenLine, caption: 'Draft & edit', accent: '02', marker: 'content' },
  'Data Analysis': { icon: ChartNoAxesCombined, caption: 'Process & visualize', accent: '03', marker: 'data' },
  'Automation': { icon: Workflow, caption: 'Design workflows', accent: '04', marker: 'automation' },
  'Design & UI': { icon: Palette, caption: 'Create visuals', accent: '05', marker: 'design' },
  'Research': { icon: Search, caption: 'Gather insights', accent: '06', marker: 'research' },
};

interface BranchSidebarProps {
  selectedBranch: typeof BRANCHES[number];
  onSelectBranch: (branch: typeof BRANCHES[number]) => void;
}

export default function BranchSidebar({ selectedBranch, onSelectBranch }: BranchSidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-cyan-950/10 bg-white/76 backdrop-blur-xl flex flex-col h-full">
      <div className="border-b border-cyan-950/10 px-5 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="orbital-mark h-9 w-9"><Orbit className="relative z-10 h-4 w-4" /></span>
            <div>
              <p className="tech-label text-[10px] text-cyan-700">System map / 01</p>
              <h1 className="blueprint-headline mt-1 text-2xl">Autonomous<br />AI Hub</h1>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-pink-400" aria-hidden="true" />
        </div>
        <p className="max-w-52 text-sm leading-relaxed text-slate-500">A living map for ideas, agents, and future-facing work.</p>
      </div>

      <div className="branch-map flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="tech-label text-[10px]">Explore branches</p>
          <span className="signal-pill px-2 py-1"><span className="signal-dot" />6 active</span>
        </div>
        <nav className="space-y-1.5" aria-label="AI work branches">
          {BRANCHES.map((branch) => {
            const meta = BRANCH_META[branch];
            const Icon = meta.icon;
            const active = selectedBranch === branch;
            return (
              <Button
                key={branch}
                onClick={() => onSelectBranch(branch)}
                variant="ghost"
                aria-current={active ? 'page' : undefined}
                className={`branch-node branch-node--${meta.marker} w-full justify-start h-auto px-3 py-3.5 text-left hover:bg-transparent ${active ? 'branch-node--active' : ''}`}
              >
                <span className="ml-5 mr-3 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900/8 bg-white/70 text-slate-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{branch}</span>
                  <span className="tech-label mt-1 block truncate text-[10px] opacity-75">{meta.caption}</span>
                </span>
                <span className="tech-label text-[10px] text-slate-400">{meta.accent}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-cyan-950/10 bg-white/55 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-50 text-cyan-700"><Orbit className="h-4 w-4" /></span>
          <div><p className="tech-label text-[10px]">Navigation signal</p><p className="mt-0.5 text-xs font-medium text-slate-600">Choose a branch to begin</p></div>
        </div>
      </div>
    </aside>
  );
}
