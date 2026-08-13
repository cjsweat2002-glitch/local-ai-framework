import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';

const dbMocks = vi.hoisted(() => ({
  assertConversationOwner: vi.fn(),
  assertTaskOwner: vi.fn(),
  getOrCreateConversation: vi.fn(),
  getConversationWithMessages: vi.fn(),
  getUserConversations: vi.fn(),
  addMessage: vi.fn(),
  updateMessage: vi.fn(),
  createTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getActiveTaskForConversation: vi.fn(),
  getTaskSnapshotForUser: vi.fn(),
  getUserTasks: vi.fn(),
  createGeminiMirror: vi.fn(),
  deleteGeminiMirror: vi.fn(),
  createProviderMarketSignal: vi.fn(),
  createSystemNode: vi.fn(),
  createTensorExchange: vi.fn(),
  createWatcherProposal: vi.fn(),
  getSystemNodeForUser: vi.fn(),
  listProviderMarketSignals: vi.fn(),
  listSystemAuditEvents: vi.fn(),
  listSystemNodes: vi.fn(),
  listTensorExchanges: vi.fn(),
  listWatcherProposals: vi.fn(),
  listGeminiMirrors: vi.fn(),
  resolveWatcherProposal: vi.fn(),
  updateSystemWatcherConsent: vi.fn(),
}));

const manusMocks = vi.hoisted(() => ({
  createManusClient: vi.fn(),
}));

vi.mock('./db', () => dbMocks);
vi.mock('./manus', () => manusMocks);

const { appRouter } = await import('./routers');

function createContext(): TrpcContext {
  return {
    user: {
      id: 22,
      openId: 'owner-22',
      email: 'owner@example.com',
      name: 'Owner',
      loginMethod: 'manus',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('conversation write isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a message write before inserting content when the conversation is not owned', async () => {
    dbMocks.assertConversationOwner.mockRejectedValueOnce(new Error('Conversation not found'));
    const caller = appRouter.createCaller(createContext());

    await expect(caller.message.add({ conversationId: 9001, role: 'user', content: 'restricted' }))
      .rejects.toThrow('Conversation not found');
    expect(dbMocks.addMessage).not.toHaveBeenCalled();
  });

  it('creates the dedicated Gemini Developer conversation under the signed-in owner', async () => {
    dbMocks.getOrCreateConversation.mockResolvedValueOnce({ id: 71, userId: 22, branch: 'Gemini Developer' });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.conversation.getOrCreate({ branch: 'Gemini Developer' }))
      .resolves.toMatchObject({ id: 71, userId: 22, branch: 'Gemini Developer' });
    expect(dbMocks.getOrCreateConversation).toHaveBeenCalledWith(22, 'Gemini Developer');
  });

  it('rejects a task submission before creating a task when the conversation is not owned', async () => {
    dbMocks.assertConversationOwner.mockRejectedValueOnce(new Error('Conversation not found'));
    const caller = appRouter.createCaller(createContext());

    await expect(caller.task.submit({
      conversationId: 9001,
      branch: 'Code Generation',
      agentProfile: 'Standard',
      provider: 'manus',
      prompt: 'restricted',
      conversationHistory: [],
    })).rejects.toThrow('Conversation not found');
    expect(dbMocks.createTask).not.toHaveBeenCalled();
  });

  it('rejects a Google Gemini submission before creating a task when the conversation is not owned', async () => {
    dbMocks.assertConversationOwner.mockRejectedValueOnce(new Error('Conversation not found'));
    const caller = appRouter.createCaller(createContext());

    await expect(caller.task.submit({
      conversationId: 9002,
      branch: 'Code Generation',
      agentProfile: 'Lite',
      provider: 'google-gemini',
      prompt: 'restricted Gemini request',
      conversationHistory: [],
    })).rejects.toThrow('Conversation not found');
    expect(dbMocks.createTask).not.toHaveBeenCalled();
  });

  it('returns actionable guidance when Manus cannot retrieve an API-created task', async () => {
    dbMocks.assertTaskOwner.mockResolvedValueOnce(true);
    manusMocks.createManusClient.mockReturnValueOnce({
      getSnapshot: vi.fn().mockRejectedValueOnce(new Error('task not found')),
    });
    const caller = appRouter.createCaller(createContext());

    const result = await caller.task.poll({ taskId: 1, manusTaskId: 'missing-task' });

    expect(result).toMatchObject({ status: 'failed', isComplete: true });
    expect(result.output).toContain('Retry with Lite');
  });

  it('reads persisted state when polling an in-progress Built-in Forge task after refresh', async () => {
    dbMocks.assertTaskOwner.mockResolvedValueOnce(true);
    dbMocks.getTaskSnapshotForUser.mockResolvedValueOnce({
      status: 'processing',
      output: 'partial streamed output',
      isComplete: false,
    });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.task.poll({ taskId: 4, provider: 'built-in-forge' }))
      .resolves.toMatchObject({ status: 'processing', output: 'partial streamed output', isComplete: false });
    expect(manusMocks.createManusClient).not.toHaveBeenCalled();
  });

  it('does not expose persisted Google Gemini task output when task ownership is denied', async () => {
    dbMocks.assertTaskOwner.mockRejectedValueOnce(new Error('Task not found'));
    const caller = appRouter.createCaller(createContext());

    const result = await caller.task.poll({ taskId: 999, provider: 'google-gemini' });

    expect(result).toMatchObject({ status: 'failed', isComplete: true, output: 'Task not found' });
    expect(dbMocks.getTaskSnapshotForUser).not.toHaveBeenCalled();
  });

  it('scopes Gemini mirror creation and listing to the signed-in owner', async () => {
    dbMocks.createGeminiMirror.mockResolvedValueOnce({ id: 7, userId: 22, name: 'Frontend Gem' });
    dbMocks.listGeminiMirrors.mockResolvedValueOnce([{ id: 7, userId: 22, name: 'Frontend Gem' }]);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.geminiWorkspace.createMirror({
      kind: 'gem-blueprint',
      name: 'Frontend Gem',
      instructions: 'Use accessible React patterns.',
    })).resolves.toMatchObject({ id: 7, userId: 22 });
    await expect(caller.geminiWorkspace.listMirrors()).resolves.toEqual([{ id: 7, userId: 22, name: 'Frontend Gem' }]);
    expect(dbMocks.createGeminiMirror).toHaveBeenCalledWith(22, expect.objectContaining({ name: 'Frontend Gem' }));
    expect(dbMocks.listGeminiMirrors).toHaveBeenCalledWith(22);
  });

  it('routes Gemini mirror removal through the signed-in owner identity', async () => {
    dbMocks.deleteGeminiMirror.mockResolvedValueOnce({ success: true });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.geminiWorkspace.deleteMirror({ mirrorId: 7 })).resolves.toEqual({ success: true });
    expect(dbMocks.deleteGeminiMirror).toHaveBeenCalledWith(22, 7);
  });

  it('does not create a watcher proposal when the requested child is not owned', async () => {
    dbMocks.getSystemNodeForUser.mockRejectedValueOnce(new Error('System node not found'));
    const caller = appRouter.createCaller(createContext());

    await expect(caller.governedSystem.reviewChild({ childNodeId: 404 }))
      .rejects.toThrow('System node not found');
    expect(dbMocks.createWatcherProposal).not.toHaveBeenCalled();
  });

  it('routes a governed proposal decision through the signed-in owner identity', async () => {
    dbMocks.resolveWatcherProposal.mockResolvedValueOnce({ success: true });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.governedSystem.resolveProposal({ proposalId: 31, decision: 'approved' }))
      .resolves.toEqual({ success: true });
    expect(dbMocks.resolveWatcherProposal).toHaveBeenCalledWith(22, 31, 'approved');
  });

  it('routes watcher-consent changes through the signed-in parent owner identity', async () => {
    dbMocks.updateSystemWatcherConsent.mockResolvedValueOnce({ success: true });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.governedSystem.setWatcherConsent({ parentNodeId: 1, enabled: true }))
      .resolves.toEqual({ success: true });
    expect(dbMocks.updateSystemWatcherConsent).toHaveBeenCalledWith(22, 1, true);
  });
});
