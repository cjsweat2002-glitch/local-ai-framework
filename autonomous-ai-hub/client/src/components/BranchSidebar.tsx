import React from 'react';
import { BRANCHES } from '../../../drizzle/schema';
import { Button } from './ui/button';

const BRANCH_ICONS: Record<typeof BRANCHES[number], string> = {
  'Code Generation': '💻',
  'Content Creation': '✍️',
  'Data Analysis': '📊',
  'Automation': '⚙️',
  'Design & UI': '🎨',
  'Research': '🔍',
};

interface BranchSidebarProps {
  selectedBranch: typeof BRANCHES[number];
  onSelectBranch: (branch: typeof BRANCHES[number]) => void;
}

export default function BranchSidebar({ selectedBranch, onSelectBranch }: BranchSidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="blueprint-headline text-2xl mb-1">Autonomous</h1>
        <h2 className="blueprint-headline text-2xl text-accent mb-3">AI Hub</h2>
        <p className="tech-label text-xs">Task Orchestration Platform</p>
      </div>

      {/* Branches */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {BRANCHES.map(branch => (
          <Button
            key={branch}
            onClick={() => onSelectBranch(branch)}
            variant={selectedBranch === branch ? 'default' : 'ghost'}
            className={`w-full justify-start text-left h-auto py-3 px-4 ${
              selectedBranch === branch
                ? 'bg-accent text-accent-foreground wireframe-border'
                : 'hover:bg-muted'
            }`}
          >
            <span className="text-xl mr-3">{BRANCH_ICONS[branch]}</span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{branch}</span>
              <span className="tech-label text-xs opacity-70 mt-0.5">
                {branch === 'Code Generation' && 'Write & refactor'}
                {branch === 'Content Creation' && 'Draft & edit'}
                {branch === 'Data Analysis' && 'Process & visualize'}
                {branch === 'Automation' && 'Design workflows'}
                {branch === 'Design & UI' && 'Create visuals'}
                {branch === 'Research' && 'Gather insights'}
              </span>
            </div>
          </Button>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 text-center">
        <p className="tech-label text-xs">Powered by Manus API</p>
        <p className="text-xs text-muted mt-2">v1.0.0</p>
      </div>
    </div>
  );
}
