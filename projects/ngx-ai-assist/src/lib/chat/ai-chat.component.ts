import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIAssistService } from '../ai-assist.service';
import { ChatMessage } from '../interfaces';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Component({
  selector: 'ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-chat-container" [class.minimized]="minimized">
      <div class="chat-header" (click)="toggleMinimize()">
        <div class="header-title">
          <span class="ai-icon">🤖</span>
          <span>{{ title }}</span>
        </div>
        <div class="header-actions">
          <button class="header-btn" (click)="$event.stopPropagation(); clearChat()" title="Clear chat">
            🗑️
          </button>
          <button class="header-btn" (click)="$event.stopPropagation(); toggleMinimize()">
            {{ minimized ? '□' : '−' }}
          </button>
          <button class="header-btn close-btn" (click)="$event.stopPropagation(); close()" *ngIf="closable">
            ✕
          </button>
        </div>
      </div>
      
      <div class="chat-body" *ngIf="!minimized">
        <div class="messages-container" #messagesContainer>
          <div
            *ngFor="let message of messages"
            class="message"
            [class.user]="message.role === 'user'"
            [class.assistant]="message.role === 'assistant'"
            [class.error]="message.role === 'error'"
          >
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <div class="message-text" [innerHTML]="renderMessage(message)"></div>
              <div class="message-time">{{ message.timestamp | date:'shortTime' }}</div>
            </div>
          </div>
          
          <div class="message assistant typing" *ngIf="isTyping">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="chat-footer">
          <div class="input-container">
           <textarea
  [(ngModel)]="inputMessage"
  placeholder="Type your message..."
  (keydown)="onKeyDown($event)"
  [disabled]="isTyping"
  rows="1"
  #messageInput
></textarea>
            <button
              class="send-btn"
              (click)="sendMessage()"
              [disabled]="!inputMessage.trim() || isTyping"
            >
              📤
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      transition: all 0.3s;
      z-index: 9999;
    }
    
    .ai-chat-container.minimized {
      height: 50px;
    }
    
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      user-select: none;
    }
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    
    .ai-icon {
      font-size: 20px;
    }
    
    .header-actions {
      display: flex;
      gap: 4px;
    }
    
    .header-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 16px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    
    .header-btn:hover {
      opacity: 1;
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    .chat-body {
      display: flex;
      flex-direction: column;
      height: 500px;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      font-size: 18px;
    }
    
    .message.user .message-avatar {
      background: #667eea;
    }
    
    .message-content {
      flex: 1;
      max-width: calc(100% - 44px);
    }
    
    .message.user .message-content {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .message-text {
      padding: 10px 14px;
      border-radius: 12px;
      background: #f3f4f6;
      word-wrap: break-word;
    }
    
    .message.user .message-text {
      background: #667eea;
      color: white;
    }
    
    .message.error .message-text {
      background: #fee;
      color: #c33;
    }
    
    .message-time {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
    }
    
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
    }
    
    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
      animation: typing 1.4s infinite;
    }
    
    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }
    
    .chat-footer {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
    }
    
    .input-container {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    
    textarea {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 20px;
      resize: none;
      max-height: 100px;
      font-family: inherit;
      font-size: 14px;
    }
    
    textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AIChatComponent implements AfterViewChecked {
  @Input() title = 'AI Assistant';
  @Input() systemPrompt = '';
  @Input() placeholder = 'Type your message...';
  @Input() closable = true;
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  
  @Output() messageSent = new EventEmitter<ChatMessage>();
  @Output() messageReceived = new EventEmitter<ChatMessage>();
  @Output() closed = new EventEmitter<void>();
  
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  inputMessage = '';
  minimized = false;
  isTyping = false;
  
  constructor(
    private aiService: AIAssistService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }
  
  sendMessage(): void {
    const content = this.inputMessage.trim();
    if (!content || this.isTyping) return;
    
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    this.messageSent.emit(userMessage);
    this.inputMessage = '';
    this.isTyping = true;
    this.cdr.detectChanges();
    
    this.aiService.sendMessage(content, this.systemPrompt).subscribe({
      next: (response) => {
        this.messages.push(response);
        this.messageReceived.emit(response);
        this.isTyping = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        const errorMessage: ChatMessage = {
          id: this.generateId(),
          role: 'error',
          content: `Error: ${error.message}`,
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isTyping = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  renderMessage(message: ChatMessage): SafeHtml {
    const html = marked.parse(message.content) as string;
    const sanitized = DOMPurify.sanitize(html);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
  
  clearChat(): void {
    this.messages = [];
    this.aiService.clearHistory();
    this.cdr.detectChanges();
  }
  
  toggleMinimize(): void {
    this.minimized = !this.minimized;
  }
  
  close(): void {
    this.closed.emit();
  }
  
  private scrollToBottom(): void {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }, 100);
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      // Allow new line with Shift+Enter
      return;
    } else {
      // Send message on Enter (without Shift)
      event.preventDefault();
      this.sendMessage();
    }
  }
}
}