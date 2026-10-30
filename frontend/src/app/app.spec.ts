import { TestBed } from '@angular/core/testing';
import { Api } from './api';
import { ChatStore } from './chat-store';
import { StreamEvent } from './models';
import { MarkdownPipe } from './markdown.pipe';

function createStore(events: StreamEvent[]) {
  const api = {
    async *stream(): AsyncGenerator<StreamEvent> {
      for (const event of events) yield event;
    },
  };
  TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] });
  return TestBed.inject(ChatStore);
}

describe('ChatStore', () => {
  beforeEach(() => localStorage.clear());

  it('builds the answer from the tokens', async () => {
    const store = createStore([{ type: 'token', text: 'Ten ' }, { type: 'token', text: 'days' }, { type: 'done' }]);

    await store.send('How many days of leave?');

    const messages = store.active()!.messages;
    expect(messages.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(messages[1].content).toBe('Ten days');
    expect(messages[1].streaming).toBe(false);
  });

  it('titles the conversation with the first question', async () => {
    const store = createStore([{ type: 'done' }]);

    await store.send('How many days of leave?');

    expect(store.active()!.title).toBe('How many days of leave?');
  });

  it('ignores an empty message', async () => {
    const store = createStore([{ type: 'done' }]);

    await store.send('   ');

    expect(store.conversations().length).toBe(0);
  });
});

describe('MarkdownPipe', () => {
  const render = (text: string, citations = 0) => {
    const pipe = TestBed.runInInjectionContext(() => new MarkdownPipe());
    return (pipe.transform(text, citations) as any).changingThisBreaksApplicationSecurity as string;
  };

  it('turns a citation mark into a button', () => {
    expect(render('Ten days [1]', 2)).toContain('data-cite="1"');
  });

  it('keeps a number that is not a source', () => {
    const html = render('See [5]', 2);
    expect(html).toContain('[5]');
    expect(html).not.toContain('data-cite');
  });

  it('removes scripts from the answer', () => {
    const html = render('Hi <img src=x onerror=alert(1)> <script>alert(1)</script>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
  });
});

