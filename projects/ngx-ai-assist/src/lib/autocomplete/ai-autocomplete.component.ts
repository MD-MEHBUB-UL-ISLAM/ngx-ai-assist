import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AIAssistService } from '../ai-assist.service';
import { AutocompleteSuggestion } from '../interfaces';

@Component({
  selector: 'ai-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-autocomplete-container" [class.focused]="focused">
      <div class="input-wrapper">
        <input
          #inputElement
          [type]="type"
          [value]="value"
          [placeholder]="placeholder"
          [disabled]="disabled"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeyDown($event)"
          class="ai-autocomplete-input"
          [class.loading]="loading"
        />
        
        <div class="ai-indicator" *ngIf="aiEnabled">
          <span class="ai-badge">AI</span>
        </div>
        
        <div class="loading-spinner" *ngIf="loading">
          <div class="spinner"></div>
        </div>
      </div>
      
      <div class="suggestions-dropdown" *ngIf="showSuggestions && suggestions.length > 0">
        <div
          *ngFor="let suggestion of suggestions; let i = index"
          class="suggestion-item"
          [class.selected]="i === selectedIndex"
          (click)="selectSuggestion(suggestion)"
          (mouseenter)="selectedIndex = i"
        >
          <div class="suggestion-text">{{ suggestion.text }}</div>
          <div class="suggestion-confidence">
            <div class="confidence-bar" [style.width.%]="suggestion.confidence * 100"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-autocomplete-container {
      position: relative;
      width: 100%;
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .ai-autocomplete-input {
      width: 100%;
      padding: 10px 12px;
      padding-right: 60px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .ai-autocomplete-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .ai-autocomplete-input.loading {
      background-image: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
      background-size: 200% 100%;
      animation: loading-shimmer 1.5s infinite;
    }
    
    .ai-indicator {
      position: absolute;
      right: 10px;
      pointer-events: none;
    }
    
    .ai-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    
    .loading-spinner {
      position: absolute;
      right: 45px;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #ddd;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-top: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }
    
    .suggestion-item {
      padding: 10px 12px;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .suggestion-item:last-child {
      border-bottom: none;
    }
    
    .suggestion-item:hover,
    .suggestion-item.selected {
      background-color: #f3f4f6;
    }
    
    .suggestion-text {
      margin-bottom: 4px;
    }
    
    .suggestion-confidence {
      height: 3px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .confidence-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      transition: width 0.3s;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes loading-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AIAutocompleteComponent implements OnInit, OnDestroy {
  @Input() value = '';
  @Input() placeholder = 'Type something...';
  @Input() type = 'text';
  @Input() disabled = false;
  @Input() aiEnabled = true;
  @Input() context = '';
  @Input() debounceMs = 300;
  @Input() minChars = 3;
  
  @Output() valueChange = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<AutocompleteSuggestion>();
  
  @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;
  
  suggestions: AutocompleteSuggestion[] = [];
  selectedIndex = -1;
  showSuggestions = false;
  focused = false;
  loading = false;
  
  private destroy$ = new Subject<void>();
  private inputSubject = new Subject<string>();

    private requestCount = 0;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; 
  
  constructor(
    private aiService: AIAssistService,
    private cdr: ChangeDetectorRef
  ) {}
  
   ngOnInit(): void {
    this.inputSubject
      .pipe(
        debounceTime(this.debounceMs),
        distinctUntilChanged(),
        switchMap(text => {
          if (!this.aiEnabled || text.length < this.minChars) {
            return of([]);
          }
          
          // Rate limiting check
          const now = Date.now();
          if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
            console.log('⏳ Rate limited, skipping request');
            return of([]);
          }
          
          this.loading = true;
          this.lastRequestTime = now;
          this.cdr.detectChanges();
          
          return this.aiService.getAutocompleteSuggestions(text, this.context);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(suggestions => {
        this.suggestions = suggestions;
        this.loading = false;
        this.showSuggestions = suggestions.length > 0 && this.focused;
        this.selectedIndex = -1;
        this.cdr.detectChanges();
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.valueChange.emit(value);
    this.inputSubject.next(value);
  }
  
  onFocus(): void {
    this.focused = true;
    if (this.suggestions.length > 0) {
      this.showSuggestions = true;
    }
  }
  
  onBlur(): void {
    setTimeout(() => {
      this.focused = false;
      this.showSuggestions = false;
      this.cdr.detectChanges();
    }, 200);
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (!this.showSuggestions) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
        break;
        
      case 'Escape':
        this.showSuggestions = false;
        break;
        
      case 'Tab':
        if (this.suggestions.length > 0) {
          event.preventDefault();
          this.selectSuggestion(this.suggestions[0]);
        }
        break;
    }
  }
  
  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.value = suggestion.text;
    this.valueChange.emit(suggestion.text);
    this.suggestionSelected.emit(suggestion);
    this.showSuggestions = false;
    this.inputElement.nativeElement.focus();
  }
}