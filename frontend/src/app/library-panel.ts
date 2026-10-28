import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { Api } from './api';
import { Icon } from './icon';
import { DocumentInfo, SearchHit, SearchMethod, isImage } from './models';

const METHODS: { id: SearchMethod; label: string; rank: string; hint: string }[] = [
  { id: 'hybrid', label: 'Hybrid', rank: 'RRF fusion score', hint: 'Keyword + vector results fused with Reciprocal Rank Fusion: best of both' },
  { id: 'keyword', label: 'Keyword', rank: 'BM25 score', hint: 'BM25 full-text: exact words, codes, names and numbers' },
  { id: 'vector', label: 'Vector', rank: 'cosine similarity', hint: 'Embedding similarity: finds meaning and synonyms, even with no shared words' },
];

interface Upload {
  name: string;
  state: 'uploading' | 'done' | 'failed';
}

// A search result, and the methods that found it.
interface Result extends SearchHit {
  matched: string[];
}

@Component({
  selector: 'app-library-panel',
  imports: [Icon, DatePipe, DecimalPipe],
  template: `
    <header>
      <h2>Library</h2>
      <button class="icon-btn" (click)="close.emit()" aria-label="Close library"><app-icon name="close" /></button>
    </header>

    <div class="tabs" role="tablist">
      <button role="tab" [class.on]="tab() === 'documents'" (click)="tab.set('documents')">
        <app-icon name="book" /> Documents <span class="count">{{ documents().length }}</span>
      </button>
      <button role="tab" [class.on]="tab() === 'images'" (click)="tab.set('images')">
        <app-icon name="image" /> Images <span class="count">{{ images().length }}</span>
      </button>
    </div>

    <p class="about">
      @if (tab() === 'documents') {
        Knowledge for <strong>Knowledge Base</strong> mode. Files are stored in Azure Blob Storage; the Azure AI Search indexer
        splits them into chunks, embeds them and indexes them, and answers quote these chunks with citations.
      } @else {
        Images for <strong>Image</strong> mode. The vision model writes a description of each image; that text is embedded
        and indexed, so you can find an image by describing it in the chat.
      }
    </p>

    <label class="box">
      <app-icon name="search" />
      <input type="search" aria-label="Search library" placeholder="Search the library…" [value]="query()" (input)="onQuery($any($event.target).value)" />
      @if (query()) {
        <button type="button" class="clear" aria-label="Clear search" (click)="onQuery('')"><app-icon name="close" /></button>
      }
    </label>
    <div class="methods" role="radiogroup" aria-label="Search method">
      @for (m of methods; track m.id) {
        <button role="radio" [attr.aria-checked]="method() === m.id" [class.on]="method() === m.id" [title]="m.hint" (click)="setMethod(m.id)">{{ m.label }}</button>
      }
    </div>
    <p class="hint">{{ current().hint }}</p>

    @if (!query()) {
      <label class="drop">
        <input type="file" multiple class="hidden" [accept]="tab() === 'documents' ? '.pdf,.docx,.txt,.md,.csv,.json,.html' : 'image/png,image/jpeg,image/webp'"
               [attr.aria-label]="tab() === 'documents' ? 'Upload documents' : 'Upload images'" (change)="onPick($event)" />
        <app-icon name="upload" />
        <strong>{{ tab() === 'documents' ? 'Upload documents' : 'Upload images' }}</strong>
        <span>{{ tab() === 'documents' ? 'PDF, DOCX, TXT, MD, CSV, JSON, HTML' : 'PNG, JPG, WEBP' }}</span>
      </label>
    }

    @if (uploads().length) {
      <ul class="uploads">
        @for (u of uploads(); track $index) {
          <li><span class="name">{{ u.name }}</span><span class="state" [attr.data-state]="u.state">{{ u.state === 'uploading' ? 'Uploading…' : u.state }}</span></li>
        }
      </ul>
    }

    <section>
      @if (query()) {
        @if (searching()) {
          <p class="muted">Searching with {{ current().label }}…</p>
        } @else {
          <p class="muted">{{ results().length }} result{{ results().length === 1 ? '' : 's' }} · {{ current().label }} search · ranked by {{ current().rank }}</p>
          <ol class="chunks">
            @for (r of results(); track $index) {
              <li>
                <div class="head">
                  <span class="rank">#{{ $index + 1 }}</span>
                  <app-icon name="file" />
                  <span class="name">{{ r.fileName }}</span>
                  @for (m of r.matched; track m) {
                    <span class="badge" [attr.data-kind]="m">{{ m }}</span>
                  }
                  <span class="score">{{ r.score | number: '1.3-3' }}</span>
                </div>
                @if (isImage(r.fileName)) {
                  <img [src]="'/api/images/' + r.fileName" [alt]="r.fileName" />
                }
                <p class="text" [innerHTML]="highlight(r.content)"></p>
              </li>
            } @empty {
              <p class="muted">No matches. Try another search method.</p>
            }
          </ol>
        }
      } @else if (tab() === 'documents') {
        <ul class="docs">
          @for (d of documents(); track d.fileName) {
            <li>
              <app-icon name="file" />
              <span class="meta">
                <span class="name">{{ d.fileName }}</span>
                <span class="muted">
                  @if (d.status === 'indexed') { {{ d.chunks }} chunk{{ d.chunks === 1 ? '' : 's' }} } @else { <span class="spinner"></span> Indexing… }
                  · {{ size(d.sizeBytes) }} · {{ d.uploadedAt | date: 'MMM d, HH:mm' }}
                </span>
              </span>
              <a class="icon-btn" [href]="'/api/documents/' + d.fileName" target="_blank" aria-label="Open original file"><app-icon name="download" /></a>
            </li>
          } @empty {
            <p class="muted">No documents yet. Upload files to build your knowledge base.</p>
          }
        </ul>
      } @else {
        <div class="grid">
          @for (d of images(); track d.fileName) {
            <figure>
              <img [src]="'/api/images/' + d.fileName" [alt]="d.fileName" loading="lazy" />
              <figcaption>{{ d.fileName }}</figcaption>
            </figure>
          } @empty {
            <p class="muted">No images yet. Upload images to search them in plain English.</p>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 16px; overflow-y: auto; background: var(--bg-sidebar); border-left: 1px solid var(--border-soft); }
    header { display: flex; align-items: center; justify-content: space-between; }
    h2 { margin: 0; font-size: 18px; }
    .tabs, .methods { display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--bg-hover); }
    .tabs button, .methods button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 13px; --icon-size: 15px; }
    .tabs button.on, .methods button.on { background: var(--bg-elev); color: var(--text); }
    .count { padding: 0 7px; border-radius: 999px; background: var(--cite-bg); font-size: 11px; }
    .about { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    .about strong { color: var(--text); }
    .box { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-input); color: var(--text-faint); }
    .box input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; }
    .clear { display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 50%; background: transparent; color: var(--text-faint); --icon-size: 14px; }
    .clear:hover { background: var(--bg-hover); color: var(--text); }
    .hint { margin: -4px 0 0; color: var(--text-faint); font-size: 12px; }
    .hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .drop { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px; border: 1.5px dashed var(--border); border-radius: 14px; color: var(--text-muted); text-align: center; cursor: pointer; --icon-size: 24px; }
    .drop:hover, .drop:focus-within { border-color: var(--accent); }
    .drop span { color: var(--text-faint); font-size: 12px; }
    ul, ol { list-style: none; margin: 0; padding: 0; }
    .uploads li, .docs li { display: flex; align-items: center; gap: 10px; padding: 8px 4px; font-size: 14px; }
    .state[data-state='done'] { color: var(--accent); }
    .state[data-state='failed'] { color: var(--danger); }
    .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .muted { color: var(--text-faint); font-size: 12.5px; }
    .spinner { display: inline-block; width: 11px; height: 11px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .chunks li { margin-bottom: 8px; padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 10px; background: var(--bg-elev); }
    .head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; font-weight: 500; --icon-size: 14px; }
    .head .name { flex: 1 1 8em; min-width: 0; }
    .rank { padding: 0 8px; border-radius: 999px; background: var(--cite-bg); font-size: 11px; font-weight: 700; }
    .badge { padding: 0 8px; border-radius: 6px; font-size: 11px; }
    .badge[data-kind='Keyword'] { background: rgba(96, 165, 250, 0.2); color: #7db3ff; }
    .badge[data-kind='Vector'] { background: rgba(244, 114, 182, 0.2); color: #f08ab8; }
    .score { color: var(--text-faint); font-size: 12px; }
    .text { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; margin: 8px 0 0; color: var(--text-muted); font-size: 13px; white-space: pre-line; }
    mark { padding: 0 2px; border-radius: 3px; background: rgba(250, 204, 21, 0.28); color: var(--text); }
    .chunks img { width: 100%; max-height: 140px; margin-top: 8px; border-radius: 8px; object-fit: cover; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    figure { margin: 0; overflow: hidden; border: 1px solid var(--border-soft); border-radius: 12px; }
    figure img { width: 100%; aspect-ratio: 4 / 3; display: block; object-fit: cover; }
    figcaption { padding: 6px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-muted); }
  `,
})
export class LibraryPanel {
  private readonly api = inject(Api);
  readonly close = output<void>();

  protected readonly methods = METHODS;
  protected readonly isImage = isImage;
  protected readonly tab = signal<'documents' | 'images'>('documents');
  protected readonly files = signal<DocumentInfo[]>([]);
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly query = signal('');
  protected readonly method = signal<SearchMethod>('hybrid');
  protected readonly results = signal<Result[]>([]);
  protected readonly searching = signal(false);

  protected readonly current = computed(() => METHODS.find(m => m.id === this.method())!);
  // The container holds documents and images: each tab shows its own kind.
  protected readonly documents = computed(() => this.files().filter(f => !isImage(f.fileName)));
  protected readonly images = computed(() => this.files().filter(f => isImage(f.fileName)));

  private timer?: ReturnType<typeof setTimeout>;
  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.refresh();
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.timer); clearTimeout(this.searchTimer); });
  }

  // Loads the files. While the indexer is still working on one, we look again in a few seconds. A failed call must not stop that.
  private async refresh() {
    clearTimeout(this.timer);
    let again = false;
    try {
      this.files.set(await this.api.documents());
      again = this.files().some(f => f.status !== 'indexed');
    } catch {
      again = true;   // the search service can be slow while it indexes
    }
    if (again) this.timer = setTimeout(() => this.refresh(), 4000);
  }

  protected async onPick(event: Event) {
    const input = event.target as HTMLInputElement;
    const picked = [...(input.files ?? [])];
    input.value = '';
    if (!picked.length) return;

    this.uploads.set(picked.map((f): Upload => ({ name: f.name, state: 'uploading' })));
    const finish = (state: Upload['state']) => this.uploads.update(list => list.map(u => (u.state === 'uploading' ? { ...u, state } : u)));
    try {
      if (this.tab() === 'documents') {
        await this.api.uploadDocuments(picked);
      } else {
        // The vision model describes each image, so one after the other.
        for (const file of picked) await this.api.uploadImage(file);
      }
      finish('done');
    } catch {
      finish('failed');
    }
    this.refresh();
  }

  // Searching waits 400 ms after the last key, so the API is not called for every letter.
  protected onQuery(text: string) {
    this.query.set(text);
    clearTimeout(this.searchTimer);
    if (!text.trim()) { this.results.set([]); return; }
    this.searchTimer = setTimeout(() => this.search(), 400);
  }

  protected setMethod(method: SearchMethod) {
    this.method.set(method);
    if (this.query().trim()) this.search();
  }

  private async search() {
    const query = this.query().trim();
    const method = this.method();
    this.searching.set(true);
    try {
      const hits = await this.api.search(query, method);
      // Azure fuses the two lists of a hybrid search itself. To show which list found each chunk, we also ask for the two lists.
      const [keyword, vector] = method === 'hybrid'
        ? await Promise.all([this.api.search(query, 'keyword'), this.api.search(query, 'vector')])
        : [[], []];
      const found = (list: SearchHit[], hit: SearchHit) => list.some(h => h.content === hit.content);
      this.results.set(hits.map(hit => ({
        ...hit,
        matched: method === 'hybrid'
          ? [...(found(keyword, hit) ? ['Keyword'] : []), ...(found(vector, hit) ? ['Vector'] : [])]
          : [this.current().label],
      })));
    } finally {
      this.searching.set(false);
    }
  }

  // The words of the question, marked in the text of a result. A vector match shares no words, so it has no marks.
  protected highlight(text: string) {
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const words = this.query().split(/\W+/).filter(w => w.length > 1);
    if (this.method() === 'vector' || !words.length) return safe;
    return safe.replace(new RegExp(`\\b(${words.join('|')})\\b`, 'gi'), '<mark>$1</mark>');
  }

  protected size(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

