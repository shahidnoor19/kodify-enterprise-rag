import { Component, computed, inject, output, signal } from '@angular/core';
import { ChatStore } from './chat-store';
import { Icon } from './icon';
import { MODES } from './models';

@Component({
  selector: 'app-sidebar',
  imports: [Icon],
  template: `
    <div class="top">
      <div class="brand"><span class="logo"><app-icon name="sparkle" /></span> Enterprise RAG</div>
      <button class="icon-btn" (click)="close.emit()" aria-label="Close sidebar"><app-icon name="sidebar" /></button>
    </div>

    <button class="row" (click)="store.newChat()"><app-icon name="edit" /> New chat</button>

    <label class="search">
      <app-icon name="search" />
      <input type="search" placeholder="Search chats" aria-label="Search chats" [value]="filter()" (input)="filter.set($any($event.target).value)" />
    </label>

    <nav class="list" aria-label="Conversations">
      @for (c of chats(); track c.id) {
        <div class="item" [class.active]="c.id === store.activeId()">
          @if (editing() === c.id) {
            <input class="rename" [value]="c.title" aria-label="Conversation title" (keydown.enter)="rename(c.id, $event)" (keydown.escape)="editing.set(null)" (blur)="rename(c.id, $event)" />
          } @else {
            <button class="title" [title]="c.title" (click)="store.select(c.id)">
              <app-icon [name]="icon(c.mode)" />
              <span>{{ c.title }}</span>
            </button>
            <div class="actions">
              <button class="icon-btn small" (click)="editing.set(c.id)" aria-label="Rename"><app-icon name="edit" /></button>
              <button class="icon-btn small" (click)="store.remove(c.id)" aria-label="Delete"><app-icon name="trash" /></button>
            </div>
          }
        </div>
      } @empty {
        <p class="empty">{{ filter() ? 'No matching chats.' : 'Your conversations will appear here.' }}</p>
      }
    </nav>

    <div class="bottom">
      <button class="row" (click)="openLibrary.emit()"><app-icon name="library" /> Knowledge & Image Library</button>
      @if (store.conversations().length) {
        <button class="clear" (click)="store.clearAll()">Clear all chats</button>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; height: 100%; padding: 10px; background: var(--bg-sidebar); }
    .top { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px 6px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .logo { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--accent); color: #fff; --icon-size: 16px; }
    .row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: 0; border-radius: 10px; background: transparent; text-align: left; }
    .row:hover { background: var(--bg-hover); }
    .search { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; background: var(--bg-hover); color: var(--text-faint); }
    .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; }
    .list { flex: 1; margin-top: 6px; overflow-y: auto; }
    .item { display: flex; align-items: center; border-radius: 10px; }
    .item:hover { background: var(--bg-hover); }
    .item.active { background: var(--bg-active); }
    .title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 8px 10px; border: 0; background: transparent; text-align: left; --icon-size: 15px; }
    .title app-icon { flex: none; color: var(--text-faint); }
    .title span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 14px; }
    .actions { display: none; padding-right: 4px; }
    .item:hover .actions, .item.active .actions { display: flex; }
    .small { width: 28px; height: 28px; --icon-size: 15px; }
    .rename { flex: 1; margin: 4px; padding: 5px 8px; border: 1px solid var(--accent); border-radius: 8px; background: var(--bg); outline: 0; }
    .empty { padding: 14px 10px; color: var(--text-faint); font-size: 13px; }
    .bottom { display: flex; flex-direction: column; gap: 2px; padding-top: 8px; border-top: 1px solid var(--border-soft); }
    .clear { padding: 4px 10px; border: 0; background: transparent; text-align: left; color: var(--text-faint); font-size: 12px; }
    .clear:hover { color: var(--danger); }
  `,
})
export class Sidebar {
  protected readonly store = inject(ChatStore);
  readonly close = output<void>();
  readonly openLibrary = output<void>();

  protected readonly filter = signal('');
  protected readonly editing = signal<string | null>(null);
  protected readonly chats = computed(() => {
    const text = this.filter().toLowerCase();
    return this.store.sorted().filter(c => c.title.toLowerCase().includes(text));
  });

  protected icon(mode: string) {
    return MODES.find(m => m.id === mode)?.icon ?? 'chat';
  }

  protected rename(id: string, event: Event) {
    if (this.editing() !== id) return;
    this.store.rename(id, (event.target as HTMLInputElement).value);
    this.editing.set(null);
  }
}

