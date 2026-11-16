import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Citation } from './models';

// Markdown to HTML. The citation marks, like [1], become small buttons that the message listens to.
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  // Matches by citation number, not by count: the server keeps only the cited sources, so numbers can have gaps ([1], [3]).
  transform(text: string, citations: readonly Citation[] = []): SafeHtml {
    let html = marked.parse(text, { async: false, breaks: true });
    if (citations.length > 0) {
      const numbers = new Set(citations.map(c => c.number));
      html = html.replace(/\[(\d{1,2})\]/g, (mark, n) =>
        numbers.has(+n) ? `<button type="button" class="cite" data-cite="${n}">${n}</button>` : mark);
    }
    // The output of a model is untrusted: DOMPurify removes scripts, and keeps our data-cite attribute.
    return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(html, { ADD_ATTR: ['data-cite'] }));
  }
}

