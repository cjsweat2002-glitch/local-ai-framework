import React from 'react';
import { trpc } from '@/lib/trpc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { providerLabel } from '@/lib/providerLabels';

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function TaskHistory() {
  const [, setLocation] = useLocation();
  const { data: tasks, isLoading } = trpc.task.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <h1 className="blueprint-headline text-4xl mb-2">Task History</h1>
          <p className="tech-label">All submitted tasks and their execution status</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-card rounded-lg border border-border wireframe-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks && tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Agent Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Output</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.branch}</TableCell>
                    <TableCell>{providerLabel(task.provider)}</TableCell>
                    <TableCell>{task.agentProfile}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {task.output || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No tasks yet</p>
              <Button onClick={() => setLocation('/')} className="btn-primary">
                Start a Conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
