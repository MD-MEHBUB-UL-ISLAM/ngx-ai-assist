// AI Provider Configuration
export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'cohere' | 'custom';
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  headers?: Record<string, string>;
}

// Chat Message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  streaming?: boolean;
}

// Completion Request
export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  context?: string;
  systemPrompt?: string;
}

// Completion Response
export interface CompletionResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter';
}

// Streaming Callbacks
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Autocomplete Suggestion
export interface AutocompleteSuggestion {
  text: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// Sentiment Analysis Result
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
}

// Smart Search Result
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  relevance: number;
  metadata?: Record<string, any>;
}

// Content Generation Options
export interface ContentGenerationOptions {
  type: 'text' | 'summary' | 'translation' | 'code' | 'email' | 'blog';
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  keywords?: string[];
  context?: string;
}

// Form Field Suggestion
export interface FormFieldSuggestion {
  fieldName: string;
  suggestedValue: any;
  confidence: number;
  reasoning?: string;
}