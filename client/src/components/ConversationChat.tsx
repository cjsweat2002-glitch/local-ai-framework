import React, { useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AGENT_PROFILES, AI_PROVIDERS, CONVERSATION_BRANCHES, TASK_STATUSES, type AIProvider, type ConversationBranch } from '../../../drizzle/schema';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { ArrowUpRight, Bot, Compass, Sparkles } from 'lucide-react';

type MessageRole = 'user' | 'assistant';
type TaskStatus = typeof TASK_STATUSES[number];

type Message = {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt: Date;
  status?: TaskStatus;
};

type ActiveTask = {
  taskId: number;
  provider: AIProvider;
  manusTaskId?: string;
  assistantMessageId: number;
};

type ProviderStreamEvent =
  | { type: 'status'; status: TaskStatus }
  | { type: 'token'; token: string }
  | { type: 'error'; message: string };

interface ConversationChatProps {
  branch: ConversationBranch;
  forcedProvider?: AIProvider;
  developerContext?: string;
  starterPrompts?: string[];
  initialPrompt?: string;
  engineLabel?: string;
}

function toMessage(message: { id: number; conversationId: number; role: string; content: string; createdAt: Date }): Message {
  return {
    ...message,
    role: message.role as MessageRole,
    createdAt: new Date(message.createdAt),
  };
}

const BRANCH_SPARKS: Partial<Record<ConversationBranch, string[]>> = {
  'Code Generation': ['Sketch a small component that solves one real friction point.', 'Review this feature idea and give me a build sequence.', 'Help me turn a rough app concept into a technical plan.'],
  'Content Creation': ['Turn this thought into a vivid, useful first draft.', 'Find the strongest angle for this idea and outline it.', 'Create a content system that keeps this voice consistent.'],
  'Data Analysis': ['Help me decide what signals matter before I analyze.', 'Turn this question into a practical analysis plan.', 'Explain what I should visualize to reveal the pattern.'],
  Automation: ['Map this repetitive task into an automation workflow.', 'Identify the handoffs that should become automatic.', 'Design a safe human-in-the-loop automation plan.'],
  'Design & UI': ['Turn this product thought into an unforgettable interface direction.', 'Create a visual system that makes this workflow easier to explore.', 'Critique this experience and propose a sharper interaction model.'],
  Research: ['Frame this curiosity as a research path with useful questions.', 'Find the assumptions I should test before moving forward.', 'Build a compact research brief for this emerging idea.'],
  'Gemini Developer': ['Plan a focused refactor for the current codebase.', 'Design a polished web interaction that feels genuinely alive.', 'Review this implementation goal and identify the clearest next step.'],
};

export default function ConversationChat({ branch, forcedProvider, developerContext, starterPrompts, initialPrompt, engineLabel }: ConversationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [agentProfile, setAgentProfile] = useState<typeof AGENT_PROFILES[number]>('Lite');
  const [provider, setProvider] = useState<AIProvider>(forcedProvider || 'built-in-forge');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [streamTarget, setStreamTarget] = useState<{ messageId: number; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalTaskIdsRef = useRef(new Set<number>());
  const utils = trpc.useUtils();
  const conversationInput = useMemo(() => ({ branch }), [branch]);
  const promptSparks = starterPrompts?.length ? starterPrompts : BRANCH_SPARKS[branch] || BRANCH_SPARKS['Code Generation'] || [];

  const { data: conversation } = trpc.conversation.getOrCreate.useQuery(conversationInput);
  const conversationId = conversation?.id || 0;
  const conversationMessagesInput = useMemo(() => ({ conversationId }), [conversationId]);
  const { data: convData, refetch: refetchMessages } = trpc.conversation.getWithMessages.useQuery(
    conversationMessagesInput,
    { enabled: Boolean(conversationId) },
  );
  const { data: persistedActiveTask } = trpc.task.activeForConversation.useQuery(
    conversationMessagesInput,
    { enabled: Boolean(conversationId) },
  );
  const addMessageMutation = trpc.message.add.useMutation();
  const submitTaskMutation = trpc.task.submit.useMutation();
  const syncTaskMutation = trpc.task.sync.useMutation();

  useEffect(() => {
    if (forcedProvider) setProvider(forcedProvider);
  }, [forcedProvider]);

  useEffect(() => {
    if (initialPrompt) setInputValue(initialPrompt);
  }, [initialPrompt]);

  const pollInput = useMemo(() => (
    {
      taskId: activeTask?.taskId || 0,
      provider: activeTask?.provider || 'manus',
      manusTaskId: activeTask?.manusTaskId,
    }
  ), [activeTask?.manusTaskId, activeTask?.provider, activeTask?.taskId]);
  const { data: pollData } = trpc.task.poll.useQuery(
    pollInput,
    {
      enabled: Boolean(activeTask),
      refetchInterval: activeTask ? 900 : false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!convData?.messages) return;
    const nextMessages = convData.messages.map(toMessage);
    setMessages((current) => {
      const isUnchanged = current.length === nextMessages.length && current.every((message, index) => {
        const next = nextMessages[index];
        return next && message.id === next.id && message.role === next.role && message.content === next.content;
      });
      return isUnchanged ? current : nextMessages;
    });
  }, [convData]);

  useEffect(() => {
    const persistedTask = persistedActiveTask?.task;
    const persistedAssistantMessageId = persistedActiveTask?.assistantMessageId;
    if (
      !persistedTask ||
      activeTask ||
      !persistedAssistantMessageId ||
      (persistedTask.provider === 'manus' && !persistedTask.manusTaskId) ||
      terminalTaskIdsRef.current.has(persistedTask.id)
    ) return;

    setActiveTask({
      taskId: persistedTask.id,
      provider: persistedTask.provider as AIProvider,
      manusTaskId: persistedTask.manusTaskId || undefined,
      assistantMessageId: persistedAssistantMessageId,
    });
    if (!isLoading) setIsLoading(true);
  }, [activeTask, isLoading, persistedActiveTask]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeTask || !pollData) return;

    setMessages((current) => {
      let changed = false;
      const next = current.map((message) => {
        if (message.id !== activeTask.assistantMessageId || message.status === pollData.status) return message;
        changed = true;
        return { ...message, status: pollData.status as TaskStatus };
      });
      return changed ? next : current;
    });
    if (pollData.output) {
      setStreamTarget((current) => (
        current?.messageId === activeTask.assistantMessageId && current.content === pollData.output
          ? current
          : { messageId: activeTask.assistantMessageId, content: pollData.output }
      ));
    }

    if (pollData.isComplete) {
      const completedTaskId = activeTask.taskId;
      terminalTaskIdsRef.current.add(completedTaskId);
      if (conversationId) {
        void syncTaskMutation.mutateAsync({
          taskId: completedTaskId,
          conversationId,
          assistantMessageId: activeTask.assistantMessageId,
          status: pollData.status as TaskStatus,
          output: pollData.output || '',
        }).then(async () => {
          await Promise.all([
            refetchMessages(),
            utils.task.activeForConversation.invalidate({ conversationId }),
            utils.task.list.invalidate(),
          ]);
        });
      }
      setActiveTask(null);
      setIsLoading(false);
    }
  }, [activeTask, conversationId, pollData, refetchMessages, syncTaskMutation, utils]);

  useEffect(() => {
    if (!streamTarget) return;
    const timer = window.setInterval(() => {
      setMessages((current) => {
        const message = current.find((item) => item.id === streamTarget.messageId);
        if (!message || message.content.length >= streamTarget.content.length) {
          window.clearInterval(timer);
          return current;
        }
        const nextLength = Math.min(streamTarget.content.length, message.content.length + 8);
        return current.map((item) => item.id === streamTarget.messageId
          ? { ...item, content: streamTarget.content.slice(0, nextLength) }
          : item
        );
      });
    }, 28);
    return () => window.clearInterval(timer);
  }, [streamTarget]);

  const streamProvider = async (streamingProvider: 'built-in-forge' | 'google-gemini', input: {
    taskId: number;
    assistantMessageId: number;
    prompt: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => {
    if (!conversation) return;
    const response = await fetch(streamingProvider === 'google-gemini' ? '/api/gemini/stream' : '/api/forge/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: input.taskId,
        conversationId: conversation.id,
        assistantMessageId: input.assistantMessageId,
        branch,
        prompt: input.prompt,
        developerContext,
        agentProfile,
        conversationHistory: input.conversationHistory,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`${streamingProvider === 'google-gemini' ? 'Google Gemini' : 'Built-in Forge'} streaming request could not be started.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let output = '';

    const applyEvent = (event: ProviderStreamEvent) => {
      if (event.type === 'token') {
        output += event.token;
        setMessages((current) => current.map((message) => (
          message.id === input.assistantMessageId
            ? { ...message, content: output, status: 'processing' }
            : message
        )));
      }
      if (event.type === 'status') {
        setMessages((current) => current.map((message) => (
          message.id === input.assistantMessageId ? { ...message, status: event.status } : message
        )));
      }
      if (event.type === 'error') throw new Error(event.message);
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
        if (data) applyEvent(JSON.parse(data) as ProviderStreamEvent);
      }
      if (done) break;
    }
    setIsLoading(false);
    await refetchMessages();
  };

  const handleSendMessage = async () => {
    const prompt = inputValue.trim();
    if (!prompt || !conversation || isLoading) return;

    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(({ role, content }) => ({ role, content }));
      const userMessage = await addMessageMutation.mutateAsync({
        conversationId: conversation.id,
        role: 'user',
        content: prompt,
      });
      setMessages((current) => [...current, toMessage(userMessage)]);

      const task = await submitTaskMutation.mutateAsync({
        conversationId: conversation.id,
        branch,
        agentProfile,
        provider,
        prompt,
        conversationHistory,
      });

      const assistantMessage = await addMessageMutation.mutateAsync({
        conversationId: conversation.id,
        role: 'assistant',
        content: ('output' in task ? task.output : undefined) || (task.status === 'failed' ? 'The task could not be started.' : ''),
      });
      const assistant = {
        ...toMessage(assistantMessage),
        status: task.status as TaskStatus,
      };
      setMessages((current) => [...current, assistant]);

      if (task.status === 'processing' && (task.provider === 'built-in-forge' || task.provider === 'google-gemini')) {
        await streamProvider(task.provider, {
          taskId: task.id,
          assistantMessageId: assistant.id,
          prompt,
          conversationHistory,
        });
      } else if (task.status === 'processing' && 'manusTaskId' in task && task.manusTaskId) {
        setActiveTask({
          taskId: task.id,
          provider: 'manus',
          manusTaskId: task.manusTaskId,
          assistantMessageId: assistant.id,
        });
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage = await addMessageMutation.mutateAsync({
        conversationId: conversation.id,
        role: 'assistant',
        content: errorText,
      });
      setMessages((current) => [...current, { ...toMessage(errorMessage), status: 'failed' }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="mission-deck px-5 py-5 sm:px-7">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="orbital-mark shrink-0"><Compass className="relative z-10 h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="tech-label text-cyan-700">{engineLabel ? `Design engine / ${engineLabel}` : `Active mission / ${branch}`}</p><span className="signal-pill"><span className="signal-dot" />Ready</span></div>
              <h2 className="blueprint-headline mt-2 text-3xl sm:text-4xl">What are we building next?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use this branch as a dedicated thinking space. Every exchange stays connected to its own history.</p>
            </div>
          </div>
          <div className="blueprint-panel relative z-10 flex flex-wrap items-center gap-2 rounded-xl p-2">
            <label className="tech-label px-1" htmlFor="provider">Route</label>
            {forcedProvider ? <span className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-950">Google Gemini</span> : <Select value={provider} onValueChange={(value) => setProvider(value as AIProvider)}>
              <SelectTrigger id="provider" className="w-36 border-cyan-950/10 bg-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((item) => (
                  <SelectItem key={item} value={item}>{item === 'manus' ? 'Manus' : item === 'google-gemini' ? 'Google Gemini' : 'Built-in Forge'}</SelectItem>
                ))}
              </SelectContent>
            </Select>}
            <label className="tech-label px-1" htmlFor="agent-profile">Depth</label>
            <Select value={agentProfile} onValueChange={(value) => setAgentProfile(value as typeof agentProfile)}>
              <SelectTrigger id="agent-profile" className="w-28 border-cyan-950/10 bg-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_PROFILES.map((profile) => <SelectItem key={profile} value={profile}>{profile}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="chat-stage min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="empty-orbit text-left">
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex items-center gap-2"><span className="signal-pill"><span className="signal-dot signal-dot--pink" />{engineLabel ? 'Engine brief loaded' : 'Blank canvas'}</span><span className="tech-label">{engineLabel || branch}</span></div>
                  <h3 className="blueprint-headline text-3xl">Begin at the edge<br />of the known.</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Choose a spark to start exploring, or bring a question that has not yet found its shape.</p>
                </div>
                <Sparkles className="h-6 w-6 text-pink-400" aria-hidden="true" />
              </div>
              <div className="relative z-10 mt-7 grid gap-2 sm:grid-cols-3">
                {promptSparks.map((suggestion) => <button key={suggestion} type="button" className="prompt-spark" onClick={() => setInputValue(suggestion)}>{suggestion}<ArrowUpRight className="mt-3 h-3.5 w-3.5 text-cyan-700" /></button>)}
              </div>
            </div>
          </div>
        ) : messages.map((message) => (
          <div key={message.id} className={`flex gap-3 animate-fade-in-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-card max-w-2xl rounded-2xl px-4 py-3.5 sm:px-5 ${message.role === 'user' ? 'message-card--user text-cyan-950' : 'message-card--assistant text-foreground'}`}>
              <div className={`mb-2 flex items-center gap-2 ${message.role === 'user' ? 'text-cyan-950/65' : 'text-slate-400'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/15"><Bot className="h-3 w-3" /></span><span className="tech-label text-[9px]" style={{ color: 'currentColor' }}>{message.role === 'user' ? 'Your signal' : 'System response'}</span></div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content || (message.status === 'processing' ? 'The system is tracing a useful path…' : '')}
              </p>
              {message.status && (
                <p className="tech-label status-marker mt-3" data-status={message.status}>
                  {message.status}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="composer-deck p-4 sm:px-7 sm:py-5">
        <div className="composer-shell flex gap-2 p-2">
          <Textarea
            value={inputValue}
            aria-label={`Describe a task for the ${branch} branch`}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder={branch === 'Gemini Developer' ? 'Describe the code, component, refactor, or web-development task for Gemini...' : `Describe a ${branch.toLowerCase()} task...`}
            className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            rows={3}
            disabled={isLoading}
          />
          <Button onClick={() => void handleSendMessage()} disabled={isLoading || !inputValue.trim()} className="btn-primary h-11 self-end rounded-xl px-4">
            {isLoading ? 'Tracing…' : <><span>Send</span><ArrowUpRight className="ml-1.5 h-4 w-4" /></>}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="tech-label">Enter to submit · Shift + Enter for a new line</p><p className="tech-label text-cyan-700">Conversation memory connected</p></div>
      </footer>
    </div>
  );
}
