import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DocumentInfo, SearchHit, SearchMethod, StreamEvent, Turn } from './models';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // POST to a streaming endpoint: yields each Server-Sent Event as soon as it arrives.
  async *stream(url: string, message: string, history: Turn[], signal: AbortSignal): AsyncGenerator<StreamEvent> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error((await response.text()) || `The request failed (${response.status}).`);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      // A frame ends with an empty line. The last piece may be half a frame: keep it for the next read.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) yield parseFrame(frame);
    }
  }

  documents() {
    return firstValueFrom(this.http.get<DocumentInfo[]>('/api/documents'));
  }

  uploadDocuments(files: File[]) {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return firstValueFrom(this.http.post('/api/documents', form));
  }

  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(this.http.post('/api/images', form));
  }

  search(query: string, method: SearchMethod) {
    return firstValueFrom(this.http.get<SearchHit[]>('/api/search', { params: { q: query, mode: method, top: 6 } }));
  }
}

function parseFrame(frame: string): StreamEvent {
  const name = /^event: (.+)$/m.exec(frame)?.[1];
  const data = JSON.parse(/^data: (.*)$/m.exec(frame)?.[1] ?? 'null');
  if (name === 'status') return { type: 'status', text: data };
  if (name === 'token') return { type: 'token', text: data };
  if (name === 'citations') return { type: 'citations', citations: data };
  return { type: 'done' };
}

