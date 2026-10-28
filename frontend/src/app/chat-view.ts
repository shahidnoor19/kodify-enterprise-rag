import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { ChatStore } from './chat-store';
import { Icon } from './icon';
import { MessageView } from './message';
import { MODES, Mode } from './models';

const SUGGESTIONS: Record<Mode, { title: string; prompt: string }[]> = {
  General: [
    { title: 'Explain RAG', prompt: 'Explain Retrieval-Augmented Generation like I am a new engineer.' },
    { title: 'Write C# code', prompt: 'Write a C# minimal API endpoint that streams Server-Sent Events.' },
    { title: 'Compare', prompt: 'Compare vector search, keyword search and hybrid search in a table.' },
    { title: 'Create an image', prompt: 'Create an image of a futuristic city skyline at sunset, digital art style.' },
  ],
  Knowledge: [
    { title: 'Leave policy', prompt: 'How many days of annual leave do employees get?' },
    { title: 'Passwords', prompt: 'What are the password rules?' },
    { title: 'Key numbers', prompt: 'List the important numbers and deadlines mentioned in the documents.' },
    { title: 'Summarize', prompt: 'Summarize the key points of the documents.' },
  ],
  Image: [
    { title: 'Revenue', prompt: 'Which quarter had the highest revenue in our revenue chart?' },
    { title: 'Safety', prompt: 'Which room has the high voltage danger sign?' },
    { title: 'Landscape', prompt: 'Show me the picture of the mountains at sunset.' },
    { title: 'Text in images', prompt: 'Which images contain readable text, and what does it say?' },
  ],
};

@Component({
  selector: 'app-chat-view',
  imports: [Icon, MessageView],
  template: `
    <header class="topbar">
      @if (!sidebarOpen()) {
        <button class="icon-btn" (click)="toggleSidebar.emit()" aria-label="Open sidebar"><app-icon name="sidebar" /></button>
        <button class="icon-btn" (click)="store.newChat()" aria-label="New chat"><app-icon name="edit" /></button>
      }
      <div class="modes" role="tablist" aria-label="Mode">
        @for (m of modes; track m.id) {
          <button role="tab" [attr.aria-selected]="store.mode() === m.id" [class.on]="store.mode() === m.id"
                  [title]="m.hint" [disabled]="store.busy()" (click)="store.mode.set(m.id)">
            <app-icon [name]="m.icon" /> <span>{{ m.label }}</span>
          </button>
        }
      </div>
      <div class="spacer"></div>
      <button class="icon-btn" (click)="openLibrary.emit()" aria-label="Open library"><app-icon name="library" /></button>
    </header>

    <main #scroller>
      @if (store.active(); as chat) {
        <div class="thread">
          @for (m of chat.messages; track m.id) {
            <app-message [message]="m" />
          }
        </div>
      } @else {
        <div class="hero">
          <h1>{{ title() }}</h1>
          <p>{{ hint() }}</p>
          <div class="cards">
            @for (s of suggestions(); track s.title) {
              <button class="card" (click)="send(s.prompt)"><strong>{{ s.title }}</strong><span>{{ s.prompt }}</span></button>
            }
          </div>
        </div>
      }
    </main>

    <footer>
      <div class="composer">
        <textarea rows="1" aria-label="Message" [placeholder]="placeholder()" [value]="draft()"
                  (input)="onInput($event)" (keydown.enter)="onEnter($event)"></textarea>
        <div class="row">
          @if (store.mode() === 'Knowledge') {
            <button class="pill" (click)="openLibrary.emit()"><app-icon name="upload" /> Upload documents</button>
          }
          <div class="spacer"></div>
          @if (store.busy()) {
            <button class="send" (click)="store.stop()" aria-label="Stop generating"><app-icon name="stop" /></button>
          } @else {
            <button class="send" [disabled]="!draft().trim()" (click)="send()" aria-label="Send message"><app-icon name="send" /></button>
          }
        </div>
      </div>
      <p class="note">AI can make mistakes. Check important info against the cited sources.</p>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; min-width: 0; background: var(--bg); }
    .topbar { display: flex; align-items: center; gap: 6px; min-height: 56px; padding: 8px 12px; }
    .spacer { flex: 1; }
    .modes { display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--bg-hover); }
    .modes button { display: flex; align-items: center; gap: 7px; padding: 6px 12px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 14px; font-weight: 500; --icon-size: 15px; }
    .modes button.on { background: var(--bg-elev); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); }
    .modes button:disabled:not(.on) { opacity: 0.5; cursor: default; }
    main { flex: 1; overflow-y: auto; }
    .thread { max-width: 780px; margin: 0 auto; padding: 16px 20px 32px; }
    .hero { max-width: 780px; margin: 0 auto; padding: 12vh 20px 20px; text-align: center; }
    .hero h1 { margin: 0 0 6px; font-size: 28px; font-weight: 600; }
    .hero p { margin: 0 0 28px; color: var(--text-muted); }
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; text-align: left; }
    .card { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 14px; background: transparent; text-align: left; }
    .card:hover { background: var(--bg-hover); }
    .card span { color: var(--text-muted); font-size: 13px; line-height: 1.45; }
    footer { padding: 0 20px 10px; }
    .composer { max-width: 780px; margin: 0 auto; padding: 10px 10px 8px 16px; border: 1px solid var(--border-soft); border-radius: 26px; background: var(--bg-input); box-shadow: var(--shadow); }
    textarea { width: 100%; max-height: 220px; padding: 6px 4px 4px; border: 0; outline: 0; resize: none; background: transparent; field-sizing: content; line-height: 1.5; }
    .row { display: flex; align-items: center; gap: 6px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 13px; --icon-size: 14px; }
    .pill:hover { background: var(--bg-hover); color: var(--text); }
    .send { width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: var(--text); color: var(--bg); }
    .send:disabled { opacity: 0.3; cursor: default; }
    .note { margin: 8px 0 0; color: var(--text-faint); font-size: 12px; text-align: center; }
  `,
})
export class ChatView {
  protected readonly store = inject(ChatStore);
  readonly sidebarOpen = input(true);
  readonly toggleSidebar = output<void>();
  readonly openLibrary = output<void>();

  protected readonly modes = MODES;
  protected readonly draft = signal('');
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly suggestions = computed(() => SUGGESTIONS[this.store.mode()]);
  protected readonly title = computed(() => ({ General: 'What can I help with?', Knowledge: 'Ask your knowledge base', Image: 'Search your images' })[this.store.mode()]);
  protected readonly hint = computed(() => MODES.find(m => m.id === this.store.mode())!.hint);
  protected readonly placeholder = computed(() => ({ General: 'Ask anything, or ask me to create an image', Knowledge: 'Ask a question about your documents', Image: 'Describe the image you are looking for' })[this.store.mode()]);

  constructor() {
    // Every change of the messages (every token) keeps the newest text in view.
    effect(() => {
      this.store.active()?.messages;
      requestAnimationFrame(() => this.scroller().nativeElement.scrollTo({ top: 1e9 }));
    });
  }

  protected onInput(event: Event) {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onEnter(event: Event) {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.send();
  }

  protected send(text = this.draft()) {
    this.draft.set('');
    this.store.send(text);
  }
}

