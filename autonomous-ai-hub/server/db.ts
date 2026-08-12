import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, tasks } from "../drizzle/schema";
import { ENV } from './_core/env';

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
