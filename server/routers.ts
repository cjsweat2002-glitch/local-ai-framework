import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { assertConversationOwner, assertTaskOwner, getActiveTaskForConversation, getOrCreateConversation, getConversationWithMessages, getUserConversations, addMessage, updateMessage, createTask, updateTaskStatus, getTaskSnapshotForUser, getUserTasks, createGeminiMirror, createProviderMarketSignal, createSystemNode, createTensorExchange, createWatcherProposal, createDevelopmentActivity, deleteGeminiMirror, getSystemNodeForUser, listDevelopmentActivities, listGeminiMirrors, listProviderMarketSignals, listSystemAuditEvents, listSystemNodes, listTensorExchanges, listWatcherProposals, resolveWatcherProposal, updateSystemWatcherConsent } from "./db";
import { AI_PROVIDERS, CONVERSATION_BRANCHES, AGENT_PROFILES } from "../drizzle/schema";
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
      .input(z.object({ branch: z.enum(CONVERSATION_BRANCHES) }))
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
        branch: z.enum(CONVERSATION_BRANCHES),
        agentProfile: z.enum(AGENT_PROFILES),
        provider: z.enum(AI_PROVIDERS).default('manus'),
        prompt: z.string(),
        conversationHistory: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertConversationOwner(ctx.user.id, input.conversationId);
        const task = await createTask(ctx.user.id, input.conversationId, input.branch, input.agentProfile, input.provider);
        try {
          await createDevelopmentActivity(ctx.user.id, {
            kind: 'task',
            level: 'info',
            title: `Task routed through ${input.provider}`,
            detail: `${input.branch} is preparing a ${input.agentProfile} task. The Activity Pulse will retain status signals while its page is open.`,
            source: 'task-router',
          });
        } catch (activityError) {
          console.warn('[ActivityPulse] Could not record task start:', activityError);
        }
        
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
          try {
            await createDevelopmentActivity(ctx.user.id, {
              kind: 'task',
              level: providerResult.status === 'completed' ? 'success' : 'warning',
              title: `Task ${providerResult.status}`,
              detail: `${input.branch} returned an immediate ${providerResult.status} result through ${input.provider}.`,
              source: 'task-router',
            });
          } catch (activityError) {
            console.warn('[ActivityPulse] Could not record task result:', activityError);
          }
          return { ...task, status: providerResult.status, output: providerResult.output || providerResult.error };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await updateTaskStatus(task.id, 'failed', undefined, errorMsg);
          try {
            await createDevelopmentActivity(ctx.user.id, {
              kind: 'task',
              level: 'warning',
              title: 'Task route needs attention',
              detail: `${input.branch} could not complete through ${input.provider}: ${errorMsg}`,
              source: 'task-router',
            });
          } catch (activityError) {
            console.warn('[ActivityPulse] Could not record task failure:', activityError);
          }
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
        if (input.status === 'completed' || input.status === 'failed') {
          try {
            await createDevelopmentActivity(ctx.user.id, {
              kind: 'task',
              level: input.status === 'completed' ? 'success' : 'warning',
              title: `Task ${input.status}`,
              detail: `A streamed task completed its synchronization cycle with ${input.status} status.`,
              source: 'task-sync',
            });
          } catch (activityError) {
            console.warn('[ActivityPulse] Could not record task synchronization:', activityError);
          }
        }
        return { success: true } as const;
      }),
    
    poll: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        provider: z.enum(AI_PROVIDERS).default('manus'),
        manusTaskId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          await assertTaskOwner(ctx.user.id, input.taskId);
          if (input.provider === 'built-in-forge' || input.provider === 'google-gemini') {
            return await getTaskSnapshotForUser(ctx.user.id, input.taskId);
          }
          if (!input.manusTaskId) throw new Error('Manus task ID is missing');
          const manus = createManusClient();
          return await manus.getSnapshot(input.manusTaskId);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const output = input.provider === 'manus' && /task not found/i.test(errorMsg)
            ? 'Manus created a task ID but could not retrieve events for the selected profile. Retry with Lite, choose Built-in Forge, or verify that the API key has task-management access.'
            : errorMsg;
          return { status: 'failed', output, isComplete: true };
        }
      }),
  }),

  geminiWorkspace: router({
    listMirrors: protectedProcedure.query(async ({ ctx }) => {
      return await listGeminiMirrors(ctx.user.id);
    }),

    createMirror: protectedProcedure
      .input(z.object({
        kind: z.enum(['gem-blueprint', 'notebook-mirror']),
        name: z.string().min(2).max(128),
        instructions: z.string().max(16000).optional(),
        notebookContent: z.string().max(40000).optional(),
        sourceUrl: z.string().url().max(1024).optional(),
      }).refine((value) => Boolean(value.instructions?.trim() || value.notebookContent?.trim()), {
        message: 'Paste the Gem instructions or notebook content to create a mirror.',
      }))
      .mutation(async ({ ctx, input }) => {
        return await createGeminiMirror(ctx.user.id, input);
      }),

    deleteMirror: protectedProcedure
      .input(z.object({ mirrorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await deleteGeminiMirror(ctx.user.id, input.mirrorId);
      }),
  }),

  activityPulse: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await listDevelopmentActivities(ctx.user.id, input?.limit ?? 60);
      }),

    record: protectedProcedure
      .input(z.object({
        kind: z.enum(['development', 'interface', 'decision', 'warning', 'task']),
        level: z.enum(['info', 'success', 'warning']).default('info'),
        title: z.string().trim().min(3).max(180),
        detail: z.string().trim().min(3).max(4000),
        source: z.string().trim().min(2).max(48).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createDevelopmentActivity(ctx.user.id, input);
      }),
  }),

  governedSystem: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const [nodes, exchanges, signals, proposals, auditEvents] = await Promise.all([
        listSystemNodes(ctx.user.id),
        listTensorExchanges(ctx.user.id),
        listProviderMarketSignals(ctx.user.id),
        listWatcherProposals(ctx.user.id),
        listSystemAuditEvents(ctx.user.id),
      ]);
      return { nodes, exchanges, signals, proposals, auditEvents };
    }),

    createNode: protectedProcedure
      .input(z.object({
        parentId: z.number().optional(),
        kind: z.enum(['parent', 'child']),
        name: z.string().min(2).max(128),
        purpose: z.string().min(8).max(4000),
        marketPosition: z.string().max(2000).optional(),
        symbolicModel: z.string().max(2000).optional(),
        capabilityModel: z.string().max(4000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createSystemNode(ctx.user.id, input);
      }),

    createExchange: protectedProcedure
      .input(z.object({
        parentNodeId: z.number(),
        childNodeId: z.number(),
        exchangeType: z.enum(['signal', 'capability', 'purpose', 'reflection']),
        title: z.string().min(3).max(180),
        payload: z.string().min(3).max(12000),
        integrityScore: z.number().int().min(0).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createTensorExchange(ctx.user.id, input);
      }),

    addMarketSignal: protectedProcedure
      .input(z.object({
        provider: z.enum(AI_PROVIDERS),
        category: z.enum(['capability', 'deployment', 'market', 'interface', 'safety']),
        title: z.string().min(3).max(180),
        summary: z.string().min(8).max(4000),
        sourceUrl: z.string().url().max(1024).optional(),
        relevanceScore: z.number().int().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createProviderMarketSignal(ctx.user.id, input);
      }),

    setWatcherConsent: protectedProcedure
      .input(z.object({ parentNodeId: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        return await updateSystemWatcherConsent(ctx.user.id, input.parentNodeId, input.enabled);
      }),

    reviewChild: protectedProcedure
      .input(z.object({ childNodeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const child = await getSystemNodeForUser(ctx.user.id, input.childNodeId);
        if (child.kind !== 'child' || !child.parentId) throw new Error('Select an owned child system to review');
        const [parent, exchanges, signals] = await Promise.all([
          getSystemNodeForUser(ctx.user.id, child.parentId),
          listTensorExchanges(ctx.user.id),
          listProviderMarketSignals(ctx.user.id),
        ]);
        const relatedExchanges = exchanges.filter(exchange => exchange.childNodeId === child.id);
        const relevantSignals = signals.filter(signal => signal.relevanceScore >= 50);
        const integrityScore = Math.min(100, 45 + Math.min(25, relatedExchanges.length * 8) + Math.min(30, relevantSignals.length * 6));
        const noiseScore = Math.max(0, 55 - Math.min(25, relatedExchanges.length * 7) - Math.min(25, relevantSignals.length * 5));
        const providerSet = Array.from(new Set(relevantSignals.map(signal => signal.provider)));
        const providerContext = providerSet.length > 0 ? providerSet.join(', ') : 'the currently logged provider landscape';
        const proposedPurpose = `${child.purpose}\n\nApproved development direction: maintain a distinct, evidence-backed interface and capability focus in response to reviewed signals from ${providerContext}.`;
        return await createWatcherProposal(ctx.user.id, {
          parentNodeId: parent.id,
          childNodeId: child.id,
          title: `Refine ${child.name} through market-aware differentiation`,
          rationale: `${relatedExchanges.length} versioned exchange(s) and ${relevantSignals.length} relevant market signal(s) were reviewed. The system is proposal-only: this recommendation cannot change the child until you approve it.`,
          proposedPurpose,
          integrityScore,
          noiseScore,
        });
      }),

    resolveProposal: protectedProcedure
      .input(z.object({ proposalId: z.number(), decision: z.enum(['approved', 'rejected']) }))
      .mutation(async ({ ctx, input }) => {
        return await resolveWatcherProposal(ctx.user.id, input.proposalId, input.decision);
      }),
  }),
});

export type AppRouter = typeof appRouter;
