import { createManusClient, toManusAgentProfile } from './manus';

export type ProviderName = 'manus' | 'built-in-forge' | 'google-gemini';

export type ProviderTaskResult = {
  status: 'processing' | 'completed' | 'failed';
  providerTaskId?: string;
  output?: string;
  error?: string;
};

export async function submitToProvider(input: {
  provider: ProviderName;
  content: string;
  agentProfile: 'Standard' | 'Lite' | 'Max';
}): Promise<ProviderTaskResult> {
  if (input.provider === 'manus') {
    const response = await createManusClient().createTask({
      agent_profile: toManusAgentProfile(input.agentProfile),
      message: { content: input.content },
      title: 'Autonomous AI Hub task',
    });
    if (!response.ok || !response.task_id) {
      return { status: 'failed', error: response.error?.message || 'Manus task creation failed' };
    }
    return { status: 'processing', providerTaskId: response.task_id };
  }

  return { status: 'processing' };
}
