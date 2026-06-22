export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export type AIMessage = {
  role: AIMessageRole;
  content: string;
};

export type AIUsageMetadata = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AIUsageContext = {
  userId: string;
  workspaceId: string;
  conversationId?: string;
};

export type AIResponseMetadata = {
  provider: string;
  model: string;
  usage?: AIUsageMetadata;
  requestId?: string;
};

export type GenerateTextInput = {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  metadata?: Record<string, string>;
  usageContext?: AIUsageContext;
  signal?: AbortSignal;
};

export type GenerateTextResult = AIResponseMetadata & {
  text: string;
};

export type StreamChatInput = GenerateTextInput;

export type AIStreamEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "done";
      metadata: AIResponseMetadata;
    };

export type EmbedTextInput = {
  text: string;
  model?: string;
  metadata?: Record<string, string>;
  usageContext?: AIUsageContext;
  signal?: AbortSignal;
};

export type EmbedTextResult = AIResponseMetadata & {
  embedding: number[];
};

export type ChatProvider = {
  streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent>;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
};

export type EmbeddingProvider = {
  embedText(input: EmbedTextInput): Promise<EmbedTextResult>;
};

export type AIProvider = ChatProvider & EmbeddingProvider;
