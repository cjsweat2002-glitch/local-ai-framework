import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import BranchSidebar from '@/components/BranchSidebar';
import ConversationChat from '@/components/ConversationChat';
import { Button } from '@/components/ui/button';
import { BRANCHES } from '../../../drizzle/schema';
import { startLogin } from '@/const';

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBranch, setSelectedBranch] = useState<typeof BRANCHES[number]>('Code Generation');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="blueprint-headline text-5xl mb-4">Autonomous AI Hub</h1>
          <p className="text-lg text-muted-foreground mb-2">Conversational AI Task Orchestration</p>
          <p className="tech-label mb-8">Powered by Manus API</p>
          <Button
            onClick={startLogin}
            className="btn-primary px-8 py-3"
          >
            Sign In with Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <BranchSidebar selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="border-b border-border px-6 py-4 bg-card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="blueprint-headline text-xl">{selectedBranch}</h1>
            <span className="tech-label text-xs">Branch</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation('/task-history')}
              variant="ghost"
              className="text-sm"
            >
              Task History
            </Button>
            <div className="hidden text-sm text-muted-foreground sm:block">{user?.name || user?.email}</div>
            <Button
              onClick={logout}
              variant="ghost"
              className="hidden text-sm sm:inline-flex"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <ConversationChat branch={selectedBranch} />
      </div>
    </div>
  );
}
