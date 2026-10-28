import { Component, signal } from '@angular/core';
import { ChatView } from './chat-view';
import { LibraryPanel } from './library-panel';
import { Sidebar } from './sidebar';

@Component({
  selector: 'app-root',
  imports: [Sidebar, ChatView, LibraryPanel],
  template: `
    <div class="layout">
      @if (sidebarOpen()) {
        <aside class="sidebar">
          <app-sidebar (close)="sidebarOpen.set(false)" (openLibrary)="libraryOpen.set(true)" />
        </aside>
      }

      <app-chat-view [sidebarOpen]="sidebarOpen()" (toggleSidebar)="sidebarOpen.set(true)" (openLibrary)="libraryOpen.set(true)" />

      @if (libraryOpen()) {
        <div class="scrim" (click)="libraryOpen.set(false)"></div>
        <aside class="library">
          <app-library-panel (close)="libraryOpen.set(false)" />
        </aside>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100dvh; }
    .layout { display: flex; height: 100%; overflow: hidden; }
    .sidebar { width: 260px; flex: none; height: 100%; }
    app-chat-view { flex: 1; min-width: 0; }
    .scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, 0.45); }
    .library { position: fixed; top: 0; right: 0; bottom: 0; z-index: 50; width: min(440px, 100vw); box-shadow: var(--shadow); }
  `,
})
export class App {
  protected readonly sidebarOpen = signal(true);
  protected readonly libraryOpen = signal(false);
}

