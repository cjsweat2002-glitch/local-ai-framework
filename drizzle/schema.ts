import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Branch types for scoped conversations
export const BRANCHES = [
  'Code Generation',
  'Content Creation',
  'Data Analysis',
  'Automation',
  'Design & UI',
  'Research'
] as const;

export const AGENT_PROFILES = ['Standard', 'Lite', 'Max'] as const;

export const TASK_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;

// Conversations table - one per user per branch
export const conversations = mysqlTable('conversations', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  branch: varchar('branch', { length: 64 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Messages table - stores full conversation history
export const messages = mysqlTable('messages', {
  id: int('id').autoincrement().primaryKey(),
  conversationId: int('conversationId').notNull(),
  role: varchar('role', { length: 16 }).notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Tasks table - tracks all Manus API submissions
export const tasks = mysqlTable('tasks', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  conversationId: int('conversationId').notNull(),
  branch: varchar('branch', { length: 64 }).notNull(),
  agentProfile: varchar('agentProfile', { length: 16 }).notNull(),
  provider: varchar('provider', { length: 32 }).notNull().default('manus'),
  status: varchar('status', { length: 16 }).notNull(),
  manusTaskId: varchar('manusTaskId', { length: 255 }),
  output: text('output'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const AI_PROVIDERS = ['manus', 'built-in-forge', 'google-gemini'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

// Governed parent–child development system. Nodes are isolated by owner and only
// exchange versioned records through the auditable tensor exchange ledger.
export const systemNodes = mysqlTable('system_nodes', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  parentId: int('parentId'),
  kind: varchar('kind', { length: 16 }).notNull(), // parent | child
  name: varchar('name', { length: 128 }).notNull(),
  purpose: text('purpose').notNull(),
  marketPosition: text('marketPosition'),
  symbolicModel: text('symbolicModel'),
  capabilityModel: text('capabilityModel'),
  autonomyBoundary: varchar('autonomyBoundary', { length: 32 }).notNull().default('proposal-only'),
  watcherConsent: boolean('watcherConsent').notNull().default(false),
  status: varchar('status', { length: 24 }).notNull().default('active'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type SystemNode = typeof systemNodes.$inferSelect;

export const tensorExchanges = mysqlTable('tensor_exchanges', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  parentNodeId: int('parentNodeId').notNull(),
  childNodeId: int('childNodeId').notNull(),
  folderKey: varchar('folderKey', { length: 255 }).notNull(),
  version: int('version').notNull().default(1),
  exchangeType: varchar('exchangeType', { length: 32 }).notNull(), // signal | proposal | approval | capability
  title: varchar('title', { length: 180 }).notNull(),
  payload: text('payload').notNull(),
  integrityScore: int('integrityScore').notNull().default(50),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type TensorExchange = typeof tensorExchanges.$inferSelect;

export const providerMarketSignals = mysqlTable('provider_market_signals', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  category: varchar('category', { length: 48 }).notNull(),
  title: varchar('title', { length: 180 }).notNull(),
  summary: text('summary').notNull(),
  sourceUrl: varchar('sourceUrl', { length: 1024 }),
  relevanceScore: int('relevanceScore').notNull().default(50),
  observedAt: timestamp('observedAt').defaultNow().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type ProviderMarketSignal = typeof providerMarketSignals.$inferSelect;

export const watcherProposals = mysqlTable('watcher_proposals', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  parentNodeId: int('parentNodeId').notNull(),
  childNodeId: int('childNodeId').notNull(),
  title: varchar('title', { length: 180 }).notNull(),
  rationale: text('rationale').notNull(),
  proposedPurpose: text('proposedPurpose').notNull(),
  integrityScore: int('integrityScore').notNull(),
  noiseScore: int('noiseScore').notNull(),
  status: varchar('status', { length: 24 }).notNull().default('proposed'),
  requiresApproval: boolean('requiresApproval').notNull().default(true),
  approvedAt: timestamp('approvedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type WatcherProposal = typeof watcherProposals.$inferSelect;

export const systemAuditEvents = mysqlTable('system_audit_events', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  action: varchar('action', { length: 48 }).notNull(),
  entityType: varchar('entityType', { length: 48 }).notNull(),
  entityId: int('entityId').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type SystemAuditEvent = typeof systemAuditEvents.$inferSelect;
