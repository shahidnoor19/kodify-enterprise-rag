import { Component, computed, input, signal } from '@angular/core';
import { Icon } from './icon';
import { MarkdownPipe } from './markdown.pipe';
import { ChatMessage, isImage } from './models';

@Component({
  selector: 'app-message',
  imports: [Icon, MarkdownPipe],
  template: `
    @let m = message();
    @if (m.role === 'user') {
      <div class="user"><div class="bubble">{{ m.content }}</div></div>
    } @else {
      <div class="assistant">
        <div class="avatar" [attr.data-mode]="m.mode"><app-icon name="sparkle" /></div>
        <div class="body">
          @if (m.status === 'Creating image…') {
            <div class="skeleton"><app-icon name="image" /><span>Creating image. This takes 15 to 30 seconds.</span></div>
          } @else if (m.status) {
            <div class="status"><span class="dots"><i></i><i></i><i></i></span>{{ m.status }}</div>
          }

          @if (images().length) {
            <div class="images">
              @for (c of images(); track c.number) {
                <a [href]="'/api/images/' + c.fileName" target="_blank" [class.hl]="active() === c.number">
                  <img [src]="'/api/images/' + c.fileName" [alt]="c.fileName" />
                  <span class="badge">{{ c.number }}</span>
                </a>
              }
            </div>
          }

          <div class="md" [innerHTML]="m.content | markdown: m.citations.length" (click)="onCite($event)"></div>
          @if (m.streaming && m.content) {
            <span class="caret"></span>
          }
          @if (m.error) {
            <div class="error"><app-icon name="alert" /> {{ m.error }}</div>
          }

          @if (documents().length && !m.streaming) {
            <div class="sources">
              <button class="toggle" (click)="open.set(!open())">
                <app-icon name="book" /> {{ documents().length }} source{{ documents().length > 1 ? 's' : '' }}
                <app-icon name="chevron" [class.open]="open()" />
              </button>
              @if (open()) {
                <ol>
                  @for (c of documents(); track c.number) {
                    <li [class.hl]="active() === c.number">
                      <button class="head" (click)="active.set(active() === c.number ? null : c.number)">
                        <span class="num">{{ c.number }}</span>
                        <app-icon name="file" />
                        <span class="name">{{ c.fileName }}</span>
                      </button>
                      @if (active() === c.number) {
                        <blockquote>{{ c.snippet }}</blockquote>
                        <a class="open-file" [href]="'/api/documents/' + c.fileName" target="_blank">
                          <app-icon name="download" /> Open {{ c.fileName }}
                        </a>
                      }
                    </li>
                  }
                </ol>
              }
            </div>
          }

          @if (!m.streaming && m.content) {
            <div class="toolbar">
              <button class="icon-btn" (click)="copy()" aria-label="Copy answer"><app-icon [name]="copied() ? 'check' : 'copy'" /></button>
              <span class="tag">{{ m.mode === 'Knowledge' ? 'Knowledge Base' : m.mode }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; padding: 10px 0; }
    .user { display: flex; justify-content: flex-end; }
    .bubble { max-width: 75%; padding: 10px 18px; border-radius: 22px; background: var(--bg-elev); white-space: pre-wrap; overflow-wrap: anywhere; }
    .assistant { display: flex; gap: 14px; }
    .avatar { flex: none; display: grid; place-items: center; width: 30px; height: 30px; margin-top: 2px; border: 1px solid var(--border); border-radius: 50%; --icon-size: 15px; }
    .avatar[data-mode='Knowledge'] { color: #60a5fa; }
    .avatar[data-mode='Image'] { color: #f472b6; }
    .body { flex: 1; min-width: 0; }
    .status { display: flex; align-items: center; gap: 10px; padding: 4px 0; color: var(--text-muted); font-size: 14px; }
    .dots { display: inline-flex; gap: 3px; }
    .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); animation: blink 1.2s infinite ease-in-out; }
    .dots i:nth-child(2) { animation-delay: 0.15s; }
    .dots i:nth-child(3) { animation-delay: 0.3s; }
    @keyframes blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
    .caret { display: inline-block; width: 9px; height: 9px; margin-left: 2px; border-radius: 50%; background: var(--text); animation: blink 1s infinite; }
    .skeleton { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: min(520px, 100%); aspect-ratio: 1; margin: 6px 0 12px; border-radius: 16px; color: var(--text-faint); font-size: 13px; --icon-size: 34px;
      background: linear-gradient(110deg, var(--bg-elev) 30%, var(--bg-hover) 50%, var(--bg-elev) 70%); background-size: 250% 100%; animation: shimmer 1.6s linear infinite; }
    @keyframes shimmer { to { background-position: -150% 0; } }
    .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-bottom: 12px; }
    .images a { position: relative; display: block; aspect-ratio: 4 / 3; overflow: hidden; border: 2px solid transparent; border-radius: 12px; background: var(--bg-elev); }
    .images a.hl { border-color: var(--accent); }
    .images img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .badge { position: absolute; top: 6px; left: 6px; min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border-radius: 10px; background: rgba(0, 0, 0, 0.65); color: #fff; font-size: 11px; font-weight: 700; }
    .error { display: flex; gap: 8px; margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: var(--danger-soft); color: var(--danger); font-size: 14px; }
    .sources { margin-top: 12px; }
    .toggle { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 13px; --icon-size: 14px; }
    .toggle:hover { background: var(--bg-hover); color: var(--text); }
    .toggle .open { transform: rotate(180deg); }
    ol { list-style: none; display: flex; flex-direction: column; gap: 6px; margin: 8px 0 0; padding: 0; }
    li { overflow: hidden; border: 1px solid var(--border-soft); border-radius: 10px; }
    li.hl { border-color: var(--accent); }
    .head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: 0; background: transparent; text-align: left; font-size: 13px; --icon-size: 14px; }
    .head:hover { background: var(--bg-hover); }
    .num { min-width: 20px; height: 20px; display: grid; place-items: center; border-radius: 10px; background: var(--cite-bg); font-size: 11px; font-weight: 700; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    blockquote { max-height: 260px; margin: 0; padding: 10px 14px 12px; overflow-y: auto; border-top: 1px solid var(--border-soft); color: var(--text-muted); font-size: 13px; white-space: pre-wrap; }
    .open-file { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 10px 14px; color: var(--accent); font-size: 12.5px; text-decoration: none; --icon-size: 13px; }
    .toolbar { display: flex; align-items: center; gap: 2px; margin: 6px 0 0 -8px; --icon-size: 16px; }
    .toolbar .icon-btn { width: 32px; height: 32px; }
    .tag { margin-left: 8px; padding: 1px 8px; border: 1px solid var(--border-soft); border-radius: 999px; color: var(--text-faint); font-size: 11px; }
  `,
})
export class MessageView {
  readonly message = input.required<ChatMessage>();

  protected readonly open = signal(true);
  protected readonly active = signal<number | null>(null);
  protected readonly copied = signal(false);

  // Image sources are shown as pictures above the answer, the others as a list of passages below it.
  protected readonly images = computed(() => this.message().citations.filter(c => isImage(c.fileName)));
  protected readonly documents = computed(() => this.message().citations.filter(c => !isImage(c.fileName)));

  // A click on a citation chip, like [1], in the text of the answer.
  protected onCite(event: MouseEvent) {
    const chip = (event.target as HTMLElement).closest<HTMLElement>('[data-cite]');
    if (!chip) return;
    this.open.set(true);
    this.active.set(Number(chip.dataset['cite']));
  }

  protected async copy() {
    await navigator.clipboard.writeText(this.message().content);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}

