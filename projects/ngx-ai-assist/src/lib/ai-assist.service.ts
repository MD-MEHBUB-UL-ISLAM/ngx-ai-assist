import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  AIProviderConfig,
  CompletionRequest,
  CompletionResponse,
  ChatMessage,
  StreamCallbacks,
  AutocompleteSuggestion,
  SentimentResult,
  SearchResult,
  ContentGenerationOptions
} from './interfaces';

export const AI_CONFIG = 'AI_CONFIG';

@Injectable({
  providedIn: 'root'
})
export class AIAssistService {
  private config: AIProviderConfig;
  private messageHistory: ChatMessage[] = [];
  private context: string = '';

  constructor(
    private http: HttpClient,
    @Optional() @Inject(AI_CONFIG) config?: AIProviderConfig
  ) {
    this.config = config || {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  /**
   * Configure the AI provider
   */
  configure(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate text completion
   */
  generateCompletion(request: CompletionRequest): Observable<CompletionResponse> {
    const fullPrompt = this.buildPrompt(request);
    
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(fullPrompt, request);
      case 'anthropic':
        return this.callAnthropic(fullPrompt, request);
      case 'google':
        return this.callGoogleAI(fullPrompt, request);
      case 'custom':
        return this.callCustomProvider(fullPrompt, request);
      default:
        return throwError(() => new Error(`Unsupported provider: ${this.config.provider}`));
    }
  }

  /**
   * Stream completion tokens
   */
 async streamCompletion(request: CompletionRequest, callbacks: StreamCallbacks): Promise<void> {
  const fullPrompt = this.buildPrompt(request);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);    }
    
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        prompt: fullPrompt,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullText);
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.text || '';
            fullText += token;
            callbacks.onToken(token);
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

  /**
   * Send chat message
   */
  sendMessage(content: string, systemPrompt?: string): Observable<ChatMessage> {
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    this.messageHistory.push(userMessage);
    
    const messages = this.prepareChatMessages(systemPrompt);
    
    return this.callChatAPI(messages).pipe(
      map(response => {
        const assistantMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date()
        };
        this.messageHistory.push(assistantMessage);
        return assistantMessage;
      })
    );
  }

  /**
   * Stream chat response
   */
 async streamChatMessage(content: string, callbacks: StreamCallbacks, systemPrompt?: string): Promise<void> {
  const userMessage: ChatMessage = {
    id: this.generateId(),
    role: 'user',
    content,
    timestamp: new Date()
  };
  
  this.messageHistory.push(userMessage);
  
  const messages = this.prepareChatMessages(systemPrompt);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }
    
    const response = await fetch(this.getChatEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            const assistantMessage: ChatMessage = {
              id: this.generateId(),
              role: 'assistant',
              content: fullText,
              timestamp: new Date()
            };
            this.messageHistory.push(assistantMessage);
            callbacks.onComplete(fullText);
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.delta?.content || '';
            fullText += token;
            callbacks.onToken(token);
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

  /**
   * Get autocomplete suggestions
   */
 getAutocompleteSuggestions(text: string, context?: string): Observable<AutocompleteSuggestion[]> {
  const prompt = `Complete the following text with 3 likely continuations. Return as JSON array with "text" and "confidence" fields.
  
Context: ${context || 'General conversation'}
Text to complete: "${text}"

Suggestions (JSON format):
[{"text": "suggestion1", "confidence": 0.9}, ...]`;

  return this.generateCompletion({ prompt }).pipe(
    map(response => {
      try {
        // FIXED: Use bracket notation instead of dot notation
        const responseText = response['text'] || '';
        const parsed = JSON.parse(responseText);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })
  );
}

  /**
   * Analyze sentiment
   */
analyzeSentiment(text: string): Observable<SentimentResult> {
  const prompt = `Analyze the sentiment of the following text. Return as JSON with "sentiment" (positive/negative/neutral), "score" (0-1), and "confidence" (0-1).
  
Text: "${text}"

JSON response:`;

  return this.generateCompletion({ prompt }).pipe(
    map(response => {
      try {
        // FIXED: Use bracket notation
        const responseText = response['text'] || '';
        return JSON.parse(responseText);
      } catch {
        return { sentiment: 'neutral' as const, score: 0.5, confidence: 0.5 };
      }
    })
  );
}

  /**
   * Generate content
   */
  generateContent(topic: string, options: ContentGenerationOptions): Observable<string> {
    const prompt = this.buildContentPrompt(topic, options);
    
    return this.generateCompletion({ prompt }).pipe(
      map(response => response.text)
    );
  }

  /**
   * Smart search
   */
smartSearch(query: string, documents: string[]): Observable<SearchResult[]> {
  const prompt = `Given the query "${query}", rank the following documents by relevance. Return as JSON array with "index" and "relevance" (0-1).
  
Documents:
${documents.map((doc, i) => `${i}: ${doc.substring(0, 200)}`).join('\n')}

JSON response:`;

  return this.generateCompletion({ prompt }).pipe(
    map(response => {
      try {
        // FIXED: Use bracket notation
        const responseText = response['text'] || '[]';
        const rankings = JSON.parse(responseText);
        return rankings.map((r: any) => ({
          id: `doc-${r.index}`,
          title: `Document ${r.index}`,
          content: documents[r.index],
          relevance: r.relevance
        }));
      } catch {
        return [];
      }
    })
  );
}

  /**
   * Suggest form field values
   */
 suggestFormField(fieldName: string, fieldType: string, context?: string): Observable<string> {
  const prompt = `Suggest an appropriate value for a form field with the following details:
  
Field Name: ${fieldName}
Field Type: ${fieldType}
${context ? `Context: ${context}` : ''}

Provide only the suggested value, no explanation.`;

  return this.generateCompletion({ prompt }).pipe(
    map(response => {
      // FIXED: Use bracket notation
      const responseText = response['text'] || '';
      return responseText.trim();
    })
  );
}

  /**
   * Summarize text
   */
 summarizeText(text: string, maxLength?: number): Observable<string> {
  const prompt = `Summarize the following text${maxLength ? ` in approximately ${maxLength} characters` : ''}:
  
${text}

Summary:`;

  return this.generateCompletion({ prompt }).pipe(
    map(response => {
      // FIXED: Use bracket notation
      return response['text'] || '';
    })
  );
}

  /**
   * Translate text
   */
  translateText(text: string, targetLanguage: string): Observable<string> {
    const prompt = `Translate the following text to ${targetLanguage}:
    
${text}

Translation:`;

    return this.generateCompletion({ prompt }).pipe(
      map(response => response.text)
    );
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Set context for future requests
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Get chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.messageHistory];
  }

  // Private helper methods
  private buildPrompt(request: CompletionRequest): string {
    let prompt = '';
    
    if (request.systemPrompt) {
      prompt += `System: ${request.systemPrompt}\n\n`;
    }
    
    if (this.context) {
      prompt += `Context: ${this.context}\n\n`;
    }
    
    if (request.context) {
      prompt += `${request.context}\n\n`;
    }
    
    prompt += request.prompt;
    
    return prompt;
  }

  private prepareChatMessages(systemPrompt?: string): any[] {
    const messages: any[] = [];
    
    if (systemPrompt || this.context) {
      messages.push({
        role: 'system',
        content: systemPrompt || this.context
      });
    }
    
    this.messageHistory.slice(-10).forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    return messages;
  }

  private callOpenAI(prompt: string, request: CompletionRequest): Observable<CompletionResponse> {
    const endpoint = this.config.endpoint || 'https://api.openai.com/v1/completions';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    });

    const body = {
      model: this.config.model || 'gpt-3.5-turbo-instruct',
      prompt,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature,
      stop: request.stopSequences
    };

    return this.http.post<any>(endpoint, body, { headers }).pipe(
      map(response => ({
        text: response.choices[0].text,
        usage: response.usage,
        finishReason: response.choices[0].finish_reason
      })),
      catchError(error => throwError(() => new Error(`OpenAI API error: ${error.message}`)))
    );
  }

  private callAnthropic(prompt: string, request: CompletionRequest): Observable<CompletionResponse> {
    // Implementation for Anthropic Claude
    return throwError(() => new Error('Anthropic integration coming soon'));
  }

  private callGoogleAI(prompt: string, request: CompletionRequest): Observable<CompletionResponse> {
    // Implementation for Google AI
    return throwError(() => new Error('Google AI integration coming soon'));
  }

  private callCustomProvider(prompt: string, request: CompletionRequest): Observable<CompletionResponse> {
    if (!this.config.endpoint) {
      return throwError(() => new Error('Custom provider requires an endpoint'));
    }

    const headers = new HttpHeaders(this.config.headers || {});
    
    const body = {
      prompt,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature
    };

    return this.http.post<CompletionResponse>(this.config.endpoint, body, { headers });
  }

  private callChatAPI(messages: any[]): Observable<CompletionResponse> {
    const endpoint = this.getChatEndpoint();
    const headers = this.getHeaders();

    const body = {
      model: this.config.model || 'gpt-3.5-turbo',
      messages,
      temperature: this.config.temperature
    };

    return this.http.post<any>(endpoint, body, { headers }).pipe(
      map(response => ({
        text: response.choices[0].message.content,
        usage: response.usage
      }))
    );
  }

  private getEndpoint(): string {
    return this.config.endpoint || 'https://api.openai.com/v1/completions';
  }

  private getChatEndpoint(): string {
    return this.config.endpoint?.replace('/completions', '/chat/completions') || 'https://api.openai.com/v1/chat/completions';
  }

  private getHeaders(): HttpHeaders {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    return new HttpHeaders(headers);
  }

  private buildContentPrompt(topic: string, options: ContentGenerationOptions): string {
    const typePrompts: Record<string, string> = {
      text: `Write a ${options.tone || 'professional'} text about "${topic}".`,
      summary: `Summarize the following text in a ${options.tone || 'neutral'} tone:\n\n${topic}`,
      translation: `Translate the following text to ${options.language || 'Spanish'}:\n\n${topic}`,
      code: `Generate code for: ${topic}. Include comments.`,
      email: `Write a ${options.tone || 'professional'} email about: ${topic}`,
      blog: `Write a ${options.length || 'medium'}-length blog post about: ${topic}`
    };

const basePrompt = typePrompts[options.type] || typePrompts['text'];
    
    let prompt = basePrompt;
    
    if (options.keywords?.length) {
      prompt += `\nInclude these keywords: ${options.keywords.join(', ')}`;
    }
    
    if (options.context) {
      prompt += `\n\nAdditional context: ${options.context}`;
    }
    
    return prompt;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}