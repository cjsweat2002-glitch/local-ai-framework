import { ENV } from './_core/env';

const MANUS_API_BASE = 'https://api.manus.ai';

type ManusAgentProfile = 'manus-1.6' | 'manus-1.6-lite' | 'manus-1.6-max';

export type ManusTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ManusTaskCreatePayload {
  agent_profile?: ManusAgentProfile;
  message: { content: string };
  title?: string;
}

export interface ManusTaskResponse {
  ok: boolean;
  task_id?: string;
  task_url?: string;
  error?: { code?: string; message?: string };
}

export interface ManusTaskEvent {
  id?: string;
  type?:
    | 'user_message'
    | 'assistant_message'
    | 'error_message'
    | 'status_update'
    | 'tool_used'
    | 'plan_update'
    | 'new_plan_step'
    | 'explanation'
    | 'user_stop'
    | 'structured_output_result';
  timestamp?: number;
  assistant_message?: { content?: string };
  error_message?: { content?: string };
  status_update?: {
    agent_status?: 'running' | 'stopped' | 'waiting' | 'error';
    brief?: string;
    description?: string;
  };
  structured_output_result?: { success?: boolean; value?: unknown };
}

export interface ManusListMessagesResponse {
  ok: boolean;
  task_id?: string;
  messages?: ManusTaskEvent[];
  error?: { code?: string; message?: string };
}

export interface ManusTaskSnapshot {
  status: ManusTaskStatus;
  output: string;
  isComplete: boolean;
}

export class ManusClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Manus API key is required');
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${MANUS_API_BASE}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-manus-api-key': this.apiKey,
        ...(init.headers || {}),
      },
    });

    const data = (await response.json()) as T & {
      ok?: boolean;
      error?: { code?: string; message?: string };
    };

    if (!response.ok || data.ok === false) {
      throw new Error(data.error?.message || `Manus API request failed (${response.status})`);
    }

    return data;
  }

  async createTask(payload: ManusTaskCreatePayload): Promise<ManusTaskResponse> {
    return this.request<ManusTaskResponse>('/v2/task.create', {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        agent_profile: payload.agent_profile || 'manus-1.6',
        ...(payload.title ? { title: payload.title } : {}),
      }),
    });
  }

  async sendMessage(
    taskId: string,
    content: string,
    agentProfile?: ManusAgentProfile,
  ): Promise<ManusTaskResponse> {
    return this.request<ManusTaskResponse>('/v2/task.sendMessage', {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        message: { content },
        ...(agentProfile ? { agent_profile: agentProfile } : {}),
      }),
    });
  }

  async listMessages(taskId: string): Promise<ManusListMessagesResponse> {
    const params = new URLSearchParams({ task_id: taskId, order: 'asc', limit: '200' });
    return this.request<ManusListMessagesResponse>(`/v2/task.listMessages?${params.toString()}`);
  }

  async getSnapshot(taskId: string): Promise<ManusTaskSnapshot> {
    const response = await this.listMessages(taskId);
    const events = response.messages || [];
    const assistantOutput = events
      .filter((event) => event.type === 'assistant_message')
      .map((event) => event.assistant_message?.content || '')
      .filter(Boolean)
      .join('\n\n');
    const errorOutput = events
      .filter((event) => event.type === 'error_message')
      .map((event) => event.error_message?.content || '')
      .filter(Boolean)
      .join('\n');
    const latestStatus = [...events]
      .reverse()
      .find((event) => event.type === 'status_update')?.status_update?.agent_status;

    let status: ManusTaskStatus = 'processing';
    if (latestStatus === 'stopped') status = 'completed';
    if (latestStatus === 'error' || errorOutput) status = 'failed';

    return {
      status,
      output: errorOutput || assistantOutput,
      isComplete: status === 'completed' || status === 'failed',
    };
  }
}

export function createManusClient(apiKey = ENV.manusApiKey || ENV.forgeApiKey || '') {
  return new ManusClient(apiKey);
}

export function toManusAgentProfile(profile: 'Standard' | 'Lite' | 'Max'): ManusAgentProfile {
  if (profile === 'Lite') return 'manus-1.6-lite';
  if (profile === 'Max') return 'manus-1.6-max';
  return 'manus-1.6';
}
