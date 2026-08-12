import React, { useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AGENT_PROFILES, AI_PROVIDERS, BRANCHES, TASK_STATUSES, type AIProvider } from '../../../drizzle/schema';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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

type ForgeStreamEvent =
  | { type: 'status'; status: TaskStatus }
  | { type: 'token'; token: string }
  | { type: 'error'; message: string };

interface ConversationChatProps {
  branch: typeof BRANCHES[number];
}

function toMessage(message: { id: number; conversationId: number; role: string; content: string; createdAt: Date }): Message {
  return {
    ...message,
    role: message.role as MessageRole,
    createdAt: new Date(message.createdAt),
  };
}

export default function ConversationChat({ branch }: ConversationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [agentProfile, setAgentProfile] = useState<typeof AGENT_PROFILES[number]>('Standard');
  const [provider, setProvider] = useState<AIProvider>('manus');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [streamTarget, setStreamTarget] = useState<{ messageId: number; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalTaskIdsRef = useRef(new Set<number>());
  const utils = trpc.useUtils();
  const conversationInput = useMemo(() => ({ branch }), [branch]);

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

  const streamBuiltInForge = async (input: {
    taskId: number;
    assistantMessageId: number;
    prompt: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => {
    if (!conversation) return;
    const response = await fetch('/api/forge/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: input.taskId,
        conversationId: conversation.id,
        assistantMessageId: input.assistantMessageId,
        branch,
        prompt: input.prompt,
        agentProfile,
        conversationHistory: input.conversationHistory,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Built-in Forge streaming request could not be started.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let output = '';

    const applyEvent = (event: ForgeStreamEvent) => {
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
        if (data) applyEvent(JSON.parse(data) as ForgeStreamEvent);
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

      if (task.status === 'processing' && task.provider === 'built-in-forge') {
        await streamBuiltInForge({
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
      <header className="border-b border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="blueprint-headline text-2xl">{branch}</h2>
            <p className="tech-label mt-1">Conversational AI orchestration</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="tech-label" htmlFor="provider">Provider:</label>
            <Select value={provider} onValueChange={(value) => setProvider(value as AIProvider)}>
              <SelectTrigger id="provider" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((item) => (
                  <SelectItem key={item} value={item}>{item === 'manus' ? 'Manus' : 'Built-in Forge'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="tech-label" htmlFor="agent-profile">Agent profile:</label>
            <Select value={agentProfile} onValueChange={(value) => setAgentProfile(value as typeof agentProfile)}>
              <SelectTrigger id="agent-profile" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_PROFILES.map((profile) => <SelectItem key={profile} value={profile}>{profile}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 wireframe-border">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="blueprint-accent">
              <p className="blueprint-headline mb-2 text-3xl">Welcome</p>
              <p className="text-muted-foreground">Start a conversation in the {branch} branch.</p>
            </div>
          </div>
        ) : messages.map((message) => (
          <div key={message.id} className={`flex gap-3 animate-fade-in-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-lg px-4 py-3 ${message.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground wireframe-border-pink'}`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content || (message.status === 'processing' ? 'Manus is preparing a response.' : '')}
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

      <footer className="border-t border-border bg-card p-4 wireframe-border">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder={`Describe a ${branch.toLowerCase()} task...`}
            className="min-h-20 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button onClick={() => void handleSendMessage()} disabled={isLoading || !inputValue.trim()} className="btn-primary self-end">
            {isLoading ? 'Working...' : 'Send'}
          </Button>
        </div>
        <p className="tech-label mt-2">Enter to submit · Shift + Enter for a new line</p>
      </footer>
    </div>
  );
}
