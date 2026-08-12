import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { ENV } from './_core/env';
import { sdk } from './_core/sdk';
import { assertConversationOwner, assertTaskOwner, updateMessage, updateTaskStatus } from './db';

const streamInput = z.object({
  taskId: z.number().int().positive(),
  conversationId: z.number().int().positive(),
  assistantMessageId: z.number().int().positive(),
  branch: z.string().min(1).max(64),
  prompt: z.string().min(1).max(20_000),
  agentProfile: z.enum(['Standard', 'Lite', 'Max']),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(20_000),
  })).max(100),
});

type ForgeSsePayload = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
};

export function getForgeCompletionUrl() {
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, '')}/v1/chat/completions`
    : 'https://forge.manus.im/v1/chat/completions';
}

export function extractForgeToken(payload: string): string | null {
  if (!payload || payload === '[DONE]') return null;
  try {
    const parsed = JSON.parse(payload) as ForgeSsePayload;
    return parsed.choices?.[0]?.delta?.content || null;
  } catch {
    return null;
  }
}

function writeEvent(res: Response, event: Record<string, unknown>) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function buildMessages(input: z.infer<typeof streamInput>) {
  const history = input.conversationHistory
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');
  return [
    {
      role: 'system',
      content: `You are the Built-in Forge provider in a conversation task orchestration platform. Work within the ${input.branch} branch. Agent profile: ${input.agentProfile}.`,
    },
    ...(history ? [{ role: 'system', content: `Conversation history:\n${history}` }] : []),
    { role: 'user', content: input.prompt },
  ];
}

export function registerForgeStreamRoute(app: Express) {
  app.post('/api/forge/stream', async (req: Request, res: Response) => {
    let finished = false;
    let input: z.infer<typeof streamInput> | undefined;
    let clientDisconnected = false;
    let userId: number | null = null;
    const controller = new AbortController();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.on('close', () => {
      if (!finished) {
        clientDisconnected = true;
      }
    });

    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        writeEvent(res, { type: 'error', message: 'Authentication is required.' });
        return;
      }
      userId = user.id;

      input = streamInput.parse(req.body);
      await assertConversationOwner(userId, input.conversationId);
      await assertTaskOwner(userId, input.taskId);
      await updateTaskStatus(input.taskId, 'processing');
      writeEvent(res, { type: 'status', status: 'processing' });

      const upstream = await fetch(getForgeCompletionUrl(), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({ messages: buildMessages(input), stream: true }),
      });

      if (!upstream.ok || !upstream.body) {
        throw new Error(`Built-in Forge stream failed (${upstream.status})`);
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let output = '';
      let lastPersistedOutput = '';

      const persistProgress = () => {
        if (!userId || !input || output.length === lastPersistedOutput.length) return;
        lastPersistedOutput = output;
        void Promise.all([
          updateMessage(userId, input.conversationId, input.assistantMessageId, output),
          updateTaskStatus(input.taskId, 'processing', undefined, output),
        ]).catch(() => undefined);
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('');
          const token = extractForgeToken(data);
          if (token) {
            output += token;
            persistProgress();
            if (!clientDisconnected) writeEvent(res, { type: 'token', token });
          }
        }
        if (done) break;
      }

      if (input && userId) {
        await updateMessage(userId, input.conversationId, input.assistantMessageId, output || 'No response was returned.');
        await updateTaskStatus(input.taskId, 'completed', undefined, output || 'No response was returned.');
        if (!clientDisconnected) writeEvent(res, { type: 'status', status: 'completed' });
      }
    } catch (error) {
      if (input && userId) {
        const message = error instanceof Error ? error.message : 'Built-in Forge streaming failed.';
        await updateTaskStatus(input.taskId, 'failed', undefined, message);
        await updateMessage(userId, input.conversationId, input.assistantMessageId, message).catch(() => undefined);
        if (!clientDisconnected) writeEvent(res, { type: 'error', message });
      }
    } finally {
      finished = true;
      if (!res.writableEnded) res.end();
    }
  });
}
