import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  AIAssistService, 
  AIAutocompleteComponent, 
  AIChatComponent, 
  ContentGeneratorComponent,
  AIProviderConfig 
} from 'ngx-ai-assist';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AIAutocompleteComponent, 
    AIChatComponent,
    ContentGeneratorComponent
  ],
  template: `
    <div class="demo-container">
      <h1>🤖 NGX AI Assist Demo</h1>
      
      <!-- API Configuration Section -->
      <div class="config-section">
        <h2>⚙️ API Configuration</h2>
        <div class="config-form">
          <div class="form-group">
            <label>Provider</label>
            <select [(ngModel)]="config.provider">
              <option value="openai">OpenAI</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>API Key</label>
            <input 
              type="password" 
              [(ngModel)]="config.apiKey" 
              placeholder="Enter your API key"
            />
          </div>
          
          <div class="form-group">
            <label>Model</label>
            <input 
              [(ngModel)]="config.model" 
              placeholder="e.g., gpt-3.5-turbo"
            />
          </div>
          
          <button class="btn btn-primary" (click)="configureAI()">
            Configure AI
          </button>
          
          <div class="config-status" [class.active]="configured">
            Status: {{ configured ? '✅ Configured' : '❌ Not Configured' }}
          </div>
        </div>
      </div>
      
      <!-- Smart Autocomplete Demo -->
      <div class="demo-section">
        <h2>📝 Smart Autocomplete</h2>
        <p>AI-powered text suggestions as you type</p>
        
        <ai-autocomplete
          [(value)]="autocompleteValue"
          placeholder="Start typing for AI suggestions..."
          context="Technology and programming topics"
          (valueChange)="onAutocompleteChange($event)"
          (suggestionSelected)="onSuggestionSelected($event)">
        </ai-autocomplete>
        
        <div class="demo-output" *ngIf="autocompleteValue">
          <strong>Current value:</strong> {{ autocompleteValue }}
        </div>
      </div>
      
      <!-- Content Generator Demo -->
      <div class="demo-section">
        <h2>✨ Content Generator</h2>
        <p>Generate text, emails, code, and more</p>
        
        <ai-content-generator
          title="AI Content Generator"
          (contentGenerated)="onContentGenerated($event)">
        </ai-content-generator>
      </div>
      
      <!-- Sentiment Analysis Demo -->
      <div class="demo-section">
        <h2>😊 Sentiment Analysis</h2>
        
        <div class="sentiment-input">
          <textarea
            [(ngModel)]="sentimentText"
            placeholder="Enter text to analyze sentiment..."
            rows="3"
          ></textarea>
          <button 
            class="btn btn-secondary" 
            (click)="analyzeSentiment()"
            [disabled]="!sentimentText || !configured || analyzing"
          >
            {{ analyzing ? 'Analyzing...' : 'Analyze Sentiment' }}
          </button>
        </div>
        
        <div class="sentiment-result" *ngIf="sentimentResult">
          <h4>Analysis Result:</h4>
          <div class="result-item">
            <span>Sentiment:</span>
            <span [class]="getSentimentClass()">{{ sentimentResult?.sentiment }}</span>
          </div>
          <div class="result-item">
            <span>Score:</span>
            <span>{{ (sentimentResult?.score || 0) | percent }}</span>
          </div>
          <div class="result-item">
            <span>Confidence:</span>
            <span>{{ (sentimentResult?.confidence || 0) | percent }}</span>
          </div>
        </div>
      </div>
      
      <!-- AI Chat Widget -->
      <ai-chat
        title="AI Assistant"
        systemPrompt="You are a helpful AI assistant. Be concise and friendly."
        placeholder="Ask me anything..."
        (messageSent)="onMessageSent($event)"
        (messageReceived)="onMessageReceived($event)">
      </ai-chat>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }
    
    .demo-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      padding-bottom: 600px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    h1 {
      color: #333;
      margin-bottom: 30px;
      font-size: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    h2 {
      color: #555;
      font-size: 20px;
      margin-bottom: 15px;
    }
    
    .config-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #e0e0e0;
    }
    
    .config-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .form-group label {
      font-weight: 600;
      color: #555;
    }
    
    .form-group input,
    .form-group select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .config-status {
      padding: 8px 12px;
      border-radius: 6px;
      background: #e0e0e0;
      color: #666;
    }
    
    .config-status.active {
      background: #d4edda;
      color: #155724;
    }
    
    .demo-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #e0e0e0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .demo-section p {
      color: #777;
      margin-bottom: 20px;
    }
    
    .demo-output {
      margin-top: 15px;
      padding: 12px;
      background: #f0f0f0;
      border-radius: 6px;
    }
    
    .sentiment-input {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .sentiment-input textarea {
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
    }
    
    .sentiment-input textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .sentiment-result {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .sentiment-result h4 {
      margin: 0 0 15px 0;
      color: #333;
    }
    
    .result-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .result-item:last-child {
      border-bottom: none;
    }
    
    .sentiment-positive {
      color: #28a745;
      font-weight: 600;
    }
    
    .sentiment-negative {
      color: #dc3545;
      font-weight: 600;
    }
    
    .sentiment-neutral {
      color: #6c757d;
      font-weight: 600;
    }
  `]
})
export class App implements OnInit {
  // Configuration
  config: AIProviderConfig = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000
  };
  configured = false;
  
  // Autocomplete
  autocompleteValue = '';
  
  // Content Generator (handled by component)
  
  // Sentiment Analysis
  sentimentText = '';
  sentimentResult: any = null;
  analyzing = false;
  
  constructor(private aiService: AIAssistService) {}
  
  ngOnInit(): void {
    // Check for stored API key
    const storedKey = localStorage.getItem('ai_api_key');
    if (storedKey) {
      this.config.apiKey = storedKey;
      this.configureAI();
    }
  }
  
  configureAI(): void {
    if (!this.config.apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    this.aiService.configure(this.config);
    this.configured = true;
    
    // Store API key (optional - be careful with security)
    if (this.config.apiKey) {
      localStorage.setItem('ai_api_key', this.config.apiKey);
    }
    
    console.log('AI Service configured!');
  }
  
  onAutocompleteChange(value: string): void {
    console.log('Autocomplete value changed:', value);
  }
  
  onSuggestionSelected(suggestion: any): void {
    console.log('Suggestion selected:', suggestion);
  }
  
  onContentGenerated(content: string): void {
    console.log('Content generated:', content.substring(0, 100) + '...');
  }
  
  analyzeSentiment(): void {
    if (!this.sentimentText || !this.configured) return;
    
    this.analyzing = true;
    
    this.aiService.analyzeSentiment(this.sentimentText).subscribe({
      next: (result) => {
        this.sentimentResult = result;
        this.analyzing = false;
        console.log('Sentiment analysis:', result);
      },
      error: (error) => {
        console.error('Sentiment analysis error:', error);
        alert('Error analyzing sentiment: ' + error.message);
        this.analyzing = false;
      }
    });
  }
  
  getSentimentClass(): string {
    if (!this.sentimentResult) return '';
    return `sentiment-${this.sentimentResult.sentiment}`;
  }
  
  onMessageSent(message: any): void {
    console.log('Message sent:', message);
  }
  
  onMessageReceived(message: any): void {
    console.log('Message received:', message);
  }
}