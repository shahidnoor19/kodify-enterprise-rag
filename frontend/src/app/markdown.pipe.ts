import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Markdown to HTML. The citation marks, like [1], become small buttons that the message listens to.
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(text: string, citations = 0): SafeHtml {
    let html = marked.parse(text, { async: false, breaks: true });
    if (citations > 0) {
      html = html.replace(/\[(\d{1,2})\]/g, (mark, n) =>
        +n >= 1 && +n <= citations ? `<button type="button" class="cite" data-cite="${n}">${n}</button>` : mark);
    }
    // The output of a model is untrusted: DOMPurify removes scripts, and keeps our data-cite attribute.
    return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(html, { ADD_ATTR: ['data-cite'] }));
  }
}

