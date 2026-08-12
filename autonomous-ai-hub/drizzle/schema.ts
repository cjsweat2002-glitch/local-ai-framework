import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const AI_PROVIDERS = ['manus', 'built-in-forge'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];