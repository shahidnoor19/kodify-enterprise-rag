export const MODES = [
  { id: 'General', label: 'General', icon: 'chat', url: '/api/chat/stream', hint: 'Chat with the model. It can also create images.' },
  { id: 'Knowledge', label: 'Knowledge Base', icon: 'book', url: '/api/ask/stream', hint: 'Answers from your documents, with citations.' },
  { id: 'Image', label: 'Image', icon: 'image', url: '/api/ask/images/stream', hint: 'Finds an image in the library and answers from what it sees.' },
] as const;

export type Mode = (typeof MODES)[number]['id'];
export type SearchMethod = 'keyword' | 'vector' | 'hybrid';

// A source of an answer: the number the model cites, the file, and a short snippet.
export interface Citation {
  number: number;
  fileName: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  mode: Mode;
  content: string;
  citations: Citation[];
  status: string | null;
  streaming: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: Mode;
  messages: ChatMessage[];
  updatedAt: number;
}

// What the API needs to know about the conversation so far.
export interface Turn {
  role: string;
  text: string;
}

// One event of the answer stream, in the order the API sends them.
export type StreamEvent =
  | { type: 'status'; text: string }
  | { type: 'token'; text: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'done' };

export interface DocumentInfo {
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  chunks: number;
  status: string;
}

export interface SearchHit {
  fileName: string;
  score: number;
  rerankerScore: number | null;
  content: string;
}

export const isImage = (fileName: string) => /\.(png|jpe?g|gif|webp)$/i.test(fileName);
