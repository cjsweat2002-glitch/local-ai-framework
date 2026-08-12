import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { assertConversationOwner, assertTaskOwner, getActiveTaskForConversation, getOrCreateConversation, getConversationWithMessages, getUserConversations, addMessage, updateMessage, createTask, updateTaskStatus, getTaskSnapshotForUser, getUserTasks } from "./db";
import { AI_PROVIDERS, BRANCHES, AGENT_PROFILES } from "../drizzle/schema";
import { createManusClient } from "./manus";
import { submitToProvider } from "./providers";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Conversation routers
  conversation: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserConversations(ctx.user.id);
    }),
    getOrCreate: protectedProcedure
      .input(z.object({ branch: z.enum(BRANCHES) }))
      .query(async ({ ctx, input }) => {
        return await getOrCreateConversation(ctx.user.id, input.branch);
      }),
    
    getWithMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getConversationWithMessages(ctx.user.id, input.conversationId);
      }),
  }),

  // Message routers
  message: router({
    add: protectedProcedure
      .input(z.object({ conversationId: z.number(), role: z.enum(['user', 'assistant']), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertConversationOwner(ctx.user.id, input.conversationId);
        return await addMessage(input.conversationId, input.role, input.content);
      }),
    update: protectedProcedure
      .input(z.object({ conversationId: z.number(), messageId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await updateMessage(ctx.user.id, input.conversationId, input.messageId, input.content);
      }),
  }),

  // Task routers
  task: router({
    submit: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        branch: z.enum(BRANCHES),
        agentProfile: z.enum(AGENT_PROFILES),
        provider: z.enum(AI_PROVIDERS).default('manus'),
        prompt: z.string(),
        conversationHistory: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertConversationOwner(ctx.user.id, input.conversationId);
        const task = await createTask(ctx.user.id, input.conversationId, input.branch, input.agentProfile, input.provider);
        
        try {
          const history = (input.conversationHistory || [])
            .map((message) => `${message.role}: ${message.content}`)
            .join('\n');
          const content = [
            `Branch: ${input.branch}`,
            history ? `Conversation history:\n${history}` : '',
            `User request:\n${input.prompt}`,
          ].filter(Boolean).join('\n\n');
          const providerResult = await submitToProvider({
            provider: input.provider,
            content,
            agentProfile: input.agentProfile,
          });

          if (providerResult.status === 'processing' && providerResult.providerTaskId) {
            await updateTaskStatus(task.id, 'processing', providerResult.providerTaskId);
            return { ...task, status: 'processing', manusTaskId: providerResult.providerTaskId };
          }

          await updateTaskStatus(task.id, providerResult.status, undefined, providerResult.output || providerResult.error);
          return { ...task, status: providerResult.status, output: providerResult.output || providerResult.error };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await updateTaskStatus(task.id, 'failed', undefined, errorMsg);
          return { ...task, status: 'failed', output: errorMsg };
        }
      }),
    
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserTasks(ctx.user.id);
      }),

    activeForConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertConversationOwner(ctx.user.id, input.conversationId);
        return await getActiveTaskForConversation(ctx.user.id, input.conversationId);
      }),

    sync: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        conversationId: z.number(),
        assistantMessageId: z.number(),
        status: z.enum(['queued', 'processing', 'completed', 'failed']),
        output: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertTaskOwner(ctx.user.id, input.taskId);
        await updateTaskStatus(input.taskId, input.status, undefined, input.output || undefined);
        if (input.output) {
          await updateMessage(ctx.user.id, input.conversationId, input.assistantMessageId, input.output);
        }
        return { success: true } as const;
      }),
    
    poll: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        provider: z.enum(['manus', 'built-in-forge']).default('manus'),
        manusTaskId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          await assertTaskOwner(ctx.user.id, input.taskId);
          if (input.provider === 'built-in-forge') {
            return await getTaskSnapshotForUser(ctx.user.id, input.taskId);
          }
          if (!input.manusTaskId) throw new Error('Manus task ID is missing');
          const manus = createManusClient();
          return await manus.getSnapshot(input.manusTaskId);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const output = /task not found/i.test(errorMsg)
            ? 'Manus created a task ID but could not retrieve it with the configured API access. Verify that the API key has task-management access, then retry or choose Built-in Forge.'
            : errorMsg;
          return { status: 'failed', output, isComplete: true };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
