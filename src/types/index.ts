export type RecordingStatus = 
  | 'IDLE' 
  | 'RECORDING' 
  | 'PAUSED' 
  | 'STOPPED' 
  | 'VALIDATING' 
  | 'TRANSCRIBING' 
  | 'SYNTHESIZING' 
  | 'COMPLETED' 
  | 'FAILED';

export interface Definition {
  term: string;
  definition: string;
  added_context?: string | null;
}

export interface NoteSection {
  heading: string;
  points: string[];
  definitions: Definition[];
  exam_flag?: string | null;
}

export interface StructuredNotes {
  title: string;
  summary: string;
  sections: NoteSection[];
}

export interface Recording {
  id: string;
  userId: string;
  subject: string;
  title: string;
  durationSeconds: number;
  audioBlob?: Blob | null;
  audioMimeType: string;
  fileSizeBytes: number;
  createdAt: number;
  status: RecordingStatus;
  errorMessage?: string | null;
  transcriptId?: string | null;
  noteId?: string | null;
}

export interface Transcript {
  id: string;
  recordingId: string;
  text: string;
  language: string;
  durationSeconds: number;
  createdAt: number;
  status: 'PENDING' | 'VALIDATING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
}

export interface Note {
  id: string;
  recordingId: string;
  transcriptId: string;
  userId: string;
  subject: string;
  title: string;
  date: string;
  durationFormatted: string;
  durationSeconds: number;
  transcriptText: string;
  structuredNotes: StructuredNotes;
  aiOriginalNotes: StructuredNotes;
  userEditedNotes?: StructuredNotes | null;
  createdAt: number;
  updatedAt: number;
  isDemo?: boolean;
}

export interface UserAccount {
  userId: string;
  name: string;
  email: string;
  college: string;
}

export interface ProcessingJob {
  recordingId: string;
  stage: 'VALIDATING' | 'TRANSCRIBING' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
  progressMessage: string;
  error?: string | null;
}
