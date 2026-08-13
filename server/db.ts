import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, tasks, geminiMirrors, systemNodes, tensorExchanges, providerMarketSignals, watcherProposals, systemAuditEvents } from "../drizzle/schema";
import { ENV } from './_core/env';
import { assertGovernedCooldown, assertWatcherReviewEligibility, GOVERNANCE_COOLDOWNS } from './governancePolicy';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export function getInsertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== 'object' || !('insertId' in header)) {
    throw new Error('Database insert did not return an insert ID');
  }

  const id = Number((header as { insertId: number | bigint }).insertId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error('Database insert returned an invalid insert ID');
  }
  return id;
}

// Conversation queries
export async function getOrCreateConversation(userId: number, branch: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.branch, branch)))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  const result = await db.insert(conversations).values({ userId, branch });
  const id = getInsertId(result);
  return { id, userId, branch, createdAt: new Date(), updatedAt: new Date() };
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function assertConversationOwner(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const owned = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (owned.length === 0) throw new Error('Conversation not found');
  return true as const;
}

export async function getConversationWithMessages(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const conv = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (conv.length === 0) throw new Error('Conversation not found');

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
  
  return { conversation: conv[0], messages: msgs };
}

// Message queries
export async function addMessage(conversationId: number, role: 'user' | 'assistant', content: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(messages).values({ conversationId, role, content });
  const id = getInsertId(result);
  return { id, conversationId, role, content, createdAt: new Date() };
}

export async function updateMessage(userId: number, conversationId: number, messageId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await assertConversationOwner(userId, conversationId);

  await db
    .update(messages)
    .set({ content })
    .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));
  return { success: true } as const;
}

// Task queries
export async function createTask(userId: number, conversationId: number, branch: string, agentProfile: string, provider = 'manus') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(tasks).values({
    userId,
    conversationId,
    branch,
    agentProfile,
    provider,
    status: 'queued'
  });
  const id = getInsertId(result);
  return { id, userId, conversationId, branch, agentProfile, provider, status: 'queued', createdAt: new Date() };
}

export async function assertTaskOwner(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const owned = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (owned.length === 0) throw new Error('Task not found');
  return true as const;
}

export async function updateTaskStatus(taskId: number, status: string, manusTaskId?: string, output?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const updates: any = { status };
  if (manusTaskId) updates.manusTaskId = manusTaskId;
  if (output) updates.output = output;
  if (status === 'completed' || status === 'failed') updates.completedAt = new Date();
  
  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
}

export async function getUserTasks(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(limit);
}

export async function getTaskSnapshotForUser(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db
    .select({ status: tasks.status, output: tasks.output })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  const task = result[0];
  if (!task) throw new Error('Task not found');

  return {
    status: task.status,
    output: task.output || '',
    isComplete: task.status === 'completed' || task.status === 'failed',
  } as const;
}

export async function getActiveTaskForConversation(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const activeTasks = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.conversationId, conversationId),
      eq(tasks.status, 'processing'),
    ))
    .orderBy(desc(tasks.createdAt))
    .limit(1);
  const task = activeTasks[0];
  if (!task) return null;

  const assistantMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.role, 'assistant')))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return { task, assistantMessageId: assistantMessages[0]?.id || null };
}

// Consumer Gemini content is mirrored only when deliberately supplied by the owner.
export async function listGeminiMirrors(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(geminiMirrors)
    .where(eq(geminiMirrors.userId, userId))
    .orderBy(desc(geminiMirrors.updatedAt));
}

export async function createGeminiMirror(userId: number, input: {
  kind: 'gem-blueprint' | 'notebook-mirror';
  name: string;
  instructions?: string;
  notebookContent?: string;
  sourceUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(geminiMirrors).values({
    userId,
    kind: input.kind,
    name: input.name,
    instructions: input.instructions || null,
    notebookContent: input.notebookContent || null,
    sourceUrl: input.sourceUrl || null,
  });
  const id = getInsertId(result);
  return { id, userId, ...input, createdAt: new Date(), updatedAt: new Date() };
}

export async function deleteGeminiMirror(userId: number, mirrorId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(geminiMirrors).where(and(eq(geminiMirrors.id, mirrorId), eq(geminiMirrors.userId, userId)));
  return { success: true } as const;
}

// Governed parent–child system helpers. Every record is scoped to the signed-in owner.
export async function assertSystemNodeOwner(userId: number, nodeId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.select({ id: systemNodes.id })
    .from(systemNodes)
    .where(and(eq(systemNodes.id, nodeId), eq(systemNodes.userId, userId)))
    .limit(1);
  if (result.length === 0) throw new Error('System node not found');
  return true as const;
}

export async function getSystemNodeForUser(userId: number, nodeId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.select().from(systemNodes)
    .where(and(eq(systemNodes.id, nodeId), eq(systemNodes.userId, userId)))
    .limit(1);
  if (result.length === 0) throw new Error('System node not found');
  return result[0];
}

export async function listSystemNodes(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(systemNodes)
    .where(eq(systemNodes.userId, userId))
    .orderBy(systemNodes.createdAt);
}

export async function createSystemNode(userId: number, input: {
  parentId?: number | null;
  kind: 'parent' | 'child';
  name: string;
  purpose: string;
  marketPosition?: string;
  symbolicModel?: string;
  capabilityModel?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (input.kind === 'child') {
    if (!input.parentId) throw new Error('A child system needs a parent system');
    const parent = await getSystemNodeForUser(userId, input.parentId);
    if (parent.kind !== 'parent') throw new Error('Child systems must reference a parent system');
  }
  if (input.kind === 'parent' && input.parentId) throw new Error('Parent systems cannot reference another parent');

  const result = await db.insert(systemNodes).values({
    userId,
    parentId: input.kind === 'child' ? input.parentId : null,
    kind: input.kind,
    name: input.name,
    purpose: input.purpose,
    marketPosition: input.marketPosition || null,
    symbolicModel: input.symbolicModel || null,
    capabilityModel: input.capabilityModel || null,
    autonomyBoundary: 'proposal-only',
    status: 'active',
  });
  const id = getInsertId(result);
  await createSystemAuditEvent(userId, 'node.created', 'system_node', id, `${input.kind}:${input.name}`);
  return await getSystemNodeForUser(userId, id);
}

export async function createSystemAuditEvent(userId: number, action: string, entityType: string, entityId: number, detail: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(systemAuditEvents).values({ userId, action, entityType, entityId, detail });
  const id = getInsertId(result);
  return { id, userId, action, entityType, entityId, detail, createdAt: new Date() };
}

export async function assertGovernedActionCooldown(userId: number, action: string, cooldownMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const latest = await db.select({ createdAt: systemAuditEvents.createdAt }).from(systemAuditEvents)
    .where(and(eq(systemAuditEvents.userId, userId), eq(systemAuditEvents.action, action)))
    .orderBy(desc(systemAuditEvents.createdAt))
    .limit(1);
  const createdAt = latest[0]?.createdAt;
  assertGovernedCooldown(createdAt, action, cooldownMinutes);
}

export async function updateSystemWatcherConsent(userId: number, parentNodeId: number, enabled: boolean) {
  const parent = await getSystemNodeForUser(userId, parentNodeId);
  if (parent.kind !== 'parent') throw new Error('Watcher consent can only be set by a parent system');
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(systemNodes).set({ watcherConsent: enabled }).where(eq(systemNodes.id, parent.id));
  await createSystemAuditEvent(userId, enabled ? 'watcher.consent_enabled' : 'watcher.consent_disabled', 'system_node', parent.id, parent.name);
  return { success: true } as const;
}

export async function listSystemAuditEvents(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(systemAuditEvents)
    .where(eq(systemAuditEvents.userId, userId))
    .orderBy(desc(systemAuditEvents.createdAt))
    .limit(limit);
}

export async function createTensorExchange(userId: number, input: {
  parentNodeId: number;
  childNodeId: number;
  exchangeType: string;
  title: string;
  payload: string;
  integrityScore: number;
  enforceCooldown?: boolean;
  auditAction?: 'exchange.created' | 'exchange.approved';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const parent = await getSystemNodeForUser(userId, input.parentNodeId);
  const child = await getSystemNodeForUser(userId, input.childNodeId);
  if (parent.kind !== 'parent' || child.kind !== 'child' || child.parentId !== parent.id) {
    throw new Error('Exchange must use an owned parent and its direct child');
  }
  if (input.enforceCooldown !== false) {
    await assertGovernedActionCooldown(userId, 'exchange.created', GOVERNANCE_COOLDOWNS.exchange);
  }
  const existing = await db.select({ id: tensorExchanges.id }).from(tensorExchanges)
    .where(and(eq(tensorExchanges.userId, userId), eq(tensorExchanges.parentNodeId, parent.id), eq(tensorExchanges.childNodeId, child.id)));
  const version = existing.length + 1;
  const folderKey = `tensor/parent-${parent.id}/child-${child.id}`;
  const result = await db.insert(tensorExchanges).values({
    userId,
    parentNodeId: parent.id,
    childNodeId: child.id,
    folderKey,
    version,
    exchangeType: input.exchangeType,
    title: input.title,
    payload: input.payload,
    integrityScore: input.integrityScore,
  });
  const id = getInsertId(result);
  await createSystemAuditEvent(userId, input.auditAction ?? 'exchange.created', 'tensor_exchange', id, `${folderKey}@v${version}`);
  return { id, folderKey, version };
}

export async function listTensorExchanges(userId: number, limit = 40) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(tensorExchanges)
    .where(eq(tensorExchanges.userId, userId))
    .orderBy(desc(tensorExchanges.createdAt))
    .limit(limit);
}

export async function createProviderMarketSignal(userId: number, input: {
  provider: string;
  category: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  relevanceScore: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertGovernedActionCooldown(userId, 'market_signal.created', GOVERNANCE_COOLDOWNS.marketSignal);
  const result = await db.insert(providerMarketSignals).values({
    userId,
    provider: input.provider,
    category: input.category,
    title: input.title,
    summary: input.summary,
    sourceUrl: input.sourceUrl || null,
    relevanceScore: input.relevanceScore,
  });
  const id = getInsertId(result);
  await createSystemAuditEvent(userId, 'market_signal.created', 'provider_market_signal', id, `${input.provider}:${input.title}`);
  return { id };
}

export async function listProviderMarketSignals(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(providerMarketSignals)
    .where(eq(providerMarketSignals.userId, userId))
    .orderBy(desc(providerMarketSignals.observedAt))
    .limit(limit);
}

export async function getActiveProposalForChild(userId: number, childNodeId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.select().from(watcherProposals)
    .where(and(eq(watcherProposals.userId, userId), eq(watcherProposals.childNodeId, childNodeId), eq(watcherProposals.status, 'proposed')))
    .limit(1);
  return result[0];
}

export async function createWatcherProposal(userId: number, input: {
  parentNodeId: number;
  childNodeId: number;
  title: string;
  rationale: string;
  proposedPurpose: string;
  integrityScore: number;
  noiseScore: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const parent = await getSystemNodeForUser(userId, input.parentNodeId);
  const child = await getSystemNodeForUser(userId, input.childNodeId);
  if (parent.kind !== 'parent' || child.parentId !== parent.id) throw new Error('Proposal must target an owned parent-child pair');
  assertWatcherReviewEligibility({ watcherConsent: parent.watcherConsent, integrityScore: input.integrityScore, noiseScore: input.noiseScore });
  if (await getActiveProposalForChild(userId, child.id)) throw new Error('Resolve the existing proposal before creating another');
  await assertGovernedActionCooldown(userId, 'watcher.proposed', GOVERNANCE_COOLDOWNS.watcherProposal);
  const result = await db.insert(watcherProposals).values({
    userId,
    parentNodeId: parent.id,
    childNodeId: child.id,
    title: input.title,
    rationale: input.rationale,
    proposedPurpose: input.proposedPurpose,
    integrityScore: input.integrityScore,
    noiseScore: input.noiseScore,
    status: 'proposed',
    requiresApproval: true,
  });
  const id = getInsertId(result);
  await createSystemAuditEvent(userId, 'watcher.proposed', 'watcher_proposal', id, `approval required for child ${child.id}`);
  return { id };
}

export async function listWatcherProposals(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(watcherProposals)
    .where(eq(watcherProposals.userId, userId))
    .orderBy(desc(watcherProposals.createdAt))
    .limit(limit);
}

export async function resolveWatcherProposal(userId: number, proposalId: number, decision: 'approved' | 'rejected') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const proposalResult = await db.select().from(watcherProposals)
    .where(and(eq(watcherProposals.id, proposalId), eq(watcherProposals.userId, userId)))
    .limit(1);
  const proposal = proposalResult[0];
  if (!proposal) throw new Error('Watcher proposal not found');
  if (proposal.status !== 'proposed') throw new Error('Watcher proposal has already been resolved');

  await db.update(watcherProposals).set({ status: decision, approvedAt: decision === 'approved' ? new Date() : null })
    .where(eq(watcherProposals.id, proposal.id));
  if (decision === 'approved') {
    await db.update(systemNodes).set({ purpose: proposal.proposedPurpose }).where(eq(systemNodes.id, proposal.childNodeId));
    await createTensorExchange(userId, {
      parentNodeId: proposal.parentNodeId,
      childNodeId: proposal.childNodeId,
      exchangeType: 'approval',
      title: proposal.title,
      payload: proposal.proposedPurpose,
      integrityScore: proposal.integrityScore,
      enforceCooldown: false,
      auditAction: 'exchange.approved',
    });
  }
  await createSystemAuditEvent(userId, `watcher.${decision}`, 'watcher_proposal', proposal.id, proposal.title);
  return { success: true } as const;
}
