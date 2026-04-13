import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIAssistService } from '../ai-assist.service';
import { ContentGenerationOptions } from '../interfaces';

@Component({
  selector: 'ai-content-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-generator">
      <div class="generator-header">
        <h3>{{ title }}</h3>
      </div>
      
      <div class="generator-body">
        <div class="form-group">
          <label>Content Type</label>
          <select [(ngModel)]="options.type">
            <option value="text">General Text</option>
            <option value="summary">Summary</option>
            <option value="translation">Translation</option>
            <option value="code">Code</option>
            <option value="email">Email</option>
            <option value="blog">Blog Post</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Tone</label>
          <select [(ngModel)]="options.tone">
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Length</label>
          <select [(ngModel)]="options.length">
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
        
        <div class="form-group" *ngIf="options.type === 'translation'">
          <label>Target Language</label>
          <input [(ngModel)]="options.language" placeholder="e.g., Spanish, French" />
        </div>
        
        <div class="form-group">
          <label>Topic / Prompt</label>
          <textarea
            [(ngModel)]="topic"
            placeholder="Enter your topic or prompt..."
            rows="4"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>Keywords (comma-separated)</label>
          <input
            [(ngModel)]="keywordsInput"
            placeholder="e.g., AI, technology, future"
          />
        </div>
        
        <div class="generator-actions">
          <button
            class="generate-btn"
            (click)="generate()"
            [disabled]="!topic || loading"
          >
            <span *ngIf="!loading">✨ Generate</span>
            <span *ngIf="loading" class="loading-text">
              <span class="spinner-small"></span> Generating...
            </span>
          </button>
        </div>
        
        <div class="generated-content" *ngIf="generatedContent">
          <div class="content-header">
            <h4>Generated Content</h4>
            <button class="copy-btn" (click)="copyContent()">📋 Copy</button>
          </div>
          <div class="content-body">{{ generatedContent }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .content-generator {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .generator-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .generator-header h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .generator-body {
      padding: 20px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #374151;
    }
    
    select, input, textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    
    select:focus, input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .generator-actions {
      margin: 20px 0;
    }
    
    .generate-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .generate-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    
    .generate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .loading-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .generated-content {
      margin-top: 20px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 6px;
    }
    
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .content-header h4 {
      margin: 0;
    }
    
    .copy-btn {
      padding: 6px 12px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .copy-btn:hover {
      background: #f3f4f6;
    }
    
    .content-body {
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.6;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentGeneratorComponent {
  @Input() title = 'AI Content Generator';
  
  @Output() contentGenerated = new EventEmitter<string>();
  
  options: ContentGenerationOptions = {
    type: 'text',
    tone: 'professional',
    length: 'medium'
  };
  
  topic = '';
  keywordsInput = '';
  generatedContent = '';
  loading = false;
  
  constructor(private aiService: AIAssistService) {}
  
  generate(): void {
    if (!this.topic || this.loading) return;
    
    this.loading = true;
    
    if (this.keywordsInput) {
      this.options.keywords = this.keywordsInput.split(',').map(k => k.trim());
    }
    
    this.aiService.generateContent(this.topic, this.options).subscribe({
      next: (content) => {
        this.generatedContent = content;
        this.contentGenerated.emit(content);
        this.loading = false;
      },
      error: (error) => {
        this.generatedContent = `Error: ${error.message}`;
        this.loading = false;
      }
    });
  }
  
  copyContent(): void {
    navigator.clipboard?.writeText(this.generatedContent);
    alert('Content copied to clipboard!');
  }
}