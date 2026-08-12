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

type GeminiStreamPayload = {
  event_type?: string;
  eventType?: string;
  delta?: { type?: string; text?: string };
};

export const GEMINI_MODEL = 'gemini-3.6-flash';

export function getGeminiStreamingUrl() {
  return 'https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse';
}

export function extractGeminiToken(payload: string): string | null {
  if (!payload || payload === '[DONE]') return null;
  try {
    const parsed = JSON.parse(payload) as GeminiStreamPayload;
    const eventType = parsed.event_type ?? parsed.eventType;
    return eventType === 'step.delta' && parsed.delta?.type === 'text'
      ? parsed.delta.text || null
      : null;
  } catch {
    return null;
  }
}

function writeEvent(res: Response, event: Record<string, unknown>) {
  if (!res.writableEnded && !res.destroyed) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

function buildGeminiInput(input: z.infer<typeof streamInput>) {
  const history = input.conversationHistory
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');
  return [history ? `Conversation history:\n${history}` : '', `User request:\n${input.prompt}`]
    .filter(Boolean)
    .join('\n\n');
}

export function registerGeminiStreamRoute(app: Express) {
  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    let finished = false;
    let clientDisconnected = false;
    let userId: number | null = null;
    let input: z.infer<typeof streamInput> | undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.on('close', () => {
      if (!finished) clientDisconnected = true;
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

      if (!ENV.geminiApiKey) throw new Error('Gemini API key is not configured.');
      const upstream = await fetch(getGeminiStreamingUrl(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': ENV.geminiApiKey,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: buildGeminiInput(input),
          stream: true,
          system_instruction: `You are the Google Gemini provider in a conversation task orchestration platform. Work within the ${input.branch} branch. Agent profile: ${input.agentProfile}.`,
        }),
      });

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        throw new Error(`Gemini stream failed (${upstream.status}): ${body.slice(0, 500)}`);
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
          const token = extractGeminiToken(data);
          if (token) {
            output += token;
            persistProgress();
            if (!clientDisconnected) writeEvent(res, { type: 'token', token });
          }
        }
        if (done) break;
      }

      const finalOutput = output || 'No response was returned.';
      if (userId && input) {
        await updateMessage(userId, input.conversationId, input.assistantMessageId, finalOutput);
        await updateTaskStatus(input.taskId, 'completed', undefined, finalOutput);
        if (!clientDisconnected) writeEvent(res, { type: 'status', status: 'completed' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini streaming failed.';
      if (userId && input) {
        await updateTaskStatus(input.taskId, 'failed', undefined, message);
        await updateMessage(userId, input.conversationId, input.assistantMessageId, message).catch(() => undefined);
      }
      if (!clientDisconnected) writeEvent(res, { type: 'error', message });
    } finally {
      finished = true;
      if (!res.writableEnded) res.end();
    }
  });
}
