import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Api } from './api';
import { ChatMessage, Conversation, MODES, Mode } from './models';

const KEY = 'rag.conversations';

// The state of the app. Components read the signals; only this class changes them.
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(Api);
  private controller?: AbortController;

  readonly conversations = signal<Conversation[]>(load());
  readonly activeId = signal<string | null>(null);
  readonly mode = signal<Mode>('General');
  readonly busy = signal(false);

  readonly active = computed(() => this.conversations().find(c => c.id === this.activeId()) ?? null);
  readonly sorted = computed(() => [...this.conversations()].sort((a, b) => b.updatedAt - a.updatedAt));

  constructor() {
    // Every change of the conversations is saved in the browser.
    effect(() => localStorage.setItem(KEY, JSON.stringify(this.conversations())));
  }

  newChat() {
    this.stop();
    this.activeId.set(null);
  }

  select(id: string) {
    this.stop();
    this.activeId.set(id);
    const mode = this.active()?.mode;
    if (mode) this.mode.set(mode);
  }

  remove(id: string) {
    if (this.activeId() === id) this.newChat();
    this.conversations.update(list => list.filter(c => c.id !== id));
  }

  rename(id: string, title: string) {
    this.update(id, c => ({ ...c, title: title.trim() || c.title }));
  }

  clearAll() {
    this.newChat();
    this.conversations.set([]);
  }

  stop() {
    this.controller?.abort();
  }

  async send(text: string) {
    const content = text.trim();
    if (!content || this.busy()) return;

    // The first question creates the conversation, and its title.
    const mode = this.mode();
    let id = this.activeId();
    if (!id) {
      id = crypto.randomUUID();
      const title = content.length > 48 ? content.slice(0, 48) + '…' : content;
      this.conversations.update(list => [{ id: id!, title, mode, messages: [], updatedAt: Date.now() }, ...list]);
      this.activeId.set(id);
    }
    const conversationId = id;

    // What the model should remember: the messages before this question.
    const history = (this.active()?.messages ?? [])
      .filter(m => m.content && !m.error)
      .map(m => ({ role: m.role, text: m.content }));

    const question: ChatMessage = { id: crypto.randomUUID(), role: 'user', mode, content, citations: [], status: null, streaming: false };
    const reply: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', mode, content: '', citations: [], status: 'Thinking…', streaming: true };
    this.update(conversationId, c => ({ ...c, mode, messages: [...c.messages, question, reply], updatedAt: Date.now() }));

    const patch = (change: (m: ChatMessage) => Partial<ChatMessage>) =>
      this.update(conversationId, c => ({ ...c, messages: c.messages.map(m => (m.id === reply.id ? { ...m, ...change(m) } : m)) }));

    this.busy.set(true);
    this.controller = new AbortController();
    try {
      const url = MODES.find(m => m.id === mode)!.url;
      for await (const event of this.api.stream(url, content, history, this.controller.signal)) {
        if (event.type === 'status') patch(() => ({ status: event.text }));
        if (event.type === 'token') patch(m => ({ status: null, content: m.content + event.text }));
        if (event.type === 'citations') patch(() => ({ citations: event.citations }));
      }
    } catch (error) {
      // Stop is not an error: the text that arrived stays on the screen.
      if ((error as Error).name !== 'AbortError') patch(() => ({ error: (error as Error).message }));
    } finally {
      patch(() => ({ streaming: false, status: null }));
      this.update(conversationId, c => ({ ...c, updatedAt: Date.now() }));
      this.busy.set(false);
    }
  }

  private update(id: string, change: (c: Conversation) => Conversation) {
    this.conversations.update(list => list.map(c => (c.id === id ? change(c) : c)));
  }
}

function load(): Conversation[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Conversation[];
    // A page that was closed in the middle of an answer must not show it as still streaming.
    return saved.map(c => ({ ...c, messages: c.messages.map(m => ({ ...m, streaming: false, status: null })) }));
  } catch {
    return [];
  }
}

