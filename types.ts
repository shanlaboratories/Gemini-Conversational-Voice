export interface TranscriptMessage {
  speaker: 'user' | 'model';
  text: string;
  isPartial: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  transcripts: TranscriptMessage[];
  mode: 'voice' | 'text';
}

export interface User {
  email: string;
}

export interface GeminiBlob {
  data: string;
  mimeType: string;
}
