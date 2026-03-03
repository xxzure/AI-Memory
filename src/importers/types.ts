export interface ImportedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
}

export interface ImportedConversation {
  external_id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages: ImportedMessage[];
  metadata?: Record<string, unknown>;
}

export interface Importer {
  source: string;
  parse(filePath: string): ImportedConversation[];
}
