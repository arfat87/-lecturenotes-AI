export type SourceType = 'AUDIO_RECORDING' | 'URL_VIDEO' | 'URL_AUDIO' | 'URL_ARTICLE';

export type SourceStatus = 
  | 'IDLE' 
  | 'RECORDING' 
  | 'PAUSED' 
  | 'STOPPED' 
  | 'FETCHING' 
  | 'VALIDATING' 
  | 'TRANSCRIBING' 
  | 'SYNTHESIZING' 
  | 'COMPLETED' 
  | 'FAILED';

export type RecordingStatus = SourceStatus;

export interface Definition {
  term: string;
  definition: string;
  context?: string;
  added_context?: string | null;
}

export interface NoteSection {
  title?: string;
  coreConcept?: string;
  definition?: string;
  explanation?: string;
  logicOrProcess?: string;
  examples?: string[];
  importantPoints?: string[];
  // Backwards compatibility with legacy fixtures and screens
  heading?: string;
  points?: string[];
  definitions?: Definition[];
  exam_flag?: string | null;
}

export interface ExampleGlobal {
  example: string;
  explanation: string;
  conceptDemonstrated: string;
}

export interface Formula {
  formula: string;
  meaning: string;
  variables: string[];
  context: string;
}

export interface ExamAlert {
  topic: string;
  reason: string;
  evidence: string;
}

export interface QuestionsMentioned {
  lecturerQuestions: string[];
  studentQuestions: string[];
}

export interface NoteContent {
  title: string;
  summary: string;
  keyTakeaways?: string[];
  sections: NoteSection[];
  definitions?: Definition[];
  examplesGlobal?: ExampleGlobal[];
  formulas?: Formula[];
  importantFacts?: string[];
  examAlerts?: ExamAlert[];
  questionsMentioned?: QuestionsMentioned;
  actionItems?: string[];
  unclearPoints?: string[];
}

// StructuredNotes is aliased to NoteContent for backward compatibility
export type StructuredNotes = NoteContent;

export interface Source {
  id: string;
  userId: string;
  sourceType?: SourceType;
  subject: string;
  title: string;
  durationSeconds: number;
  audioBlob?: Blob | null;
  audioPath?: string;
  audioMimeType?: string;
  sourceUrl?: string | null;
  fileSizeBytes?: number;
  createdAt: number;
  status: SourceStatus;
  errorMessage?: string | null;
  transcriptId?: string | null;
  noteId?: string | null;
  isDemo?: boolean;
}

// Backward compatibility alias: Recording is a Source
export type Recording = Source;

export interface Transcript {
  id: string;
  recordingId: string;
  sourceId?: string;
  sourceType?: SourceType;
  sourceUrl?: string | null;
  text: string;
  language: string;
  durationSeconds: number;
  createdAt: number;
  status: 'PENDING' | 'FETCHING' | 'VALIDATING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  isEdited?: boolean;
  originalTextRef?: string | null;
  isDemo?: boolean;
}

export interface Note {
  id: string;
  recordingId: string;
  sourceId?: string;
  sourceType?: SourceType;
  sourceUrl?: string | null;
  transcriptId: string;
  userId: string;
  subject: string;
  title: string;
  date: string;
  durationFormatted: string;
  durationSeconds: number;
  transcriptText: string;
  structuredNotes: StructuredNotes;
  content?: NoteContent;
  aiOriginalNotes: StructuredNotes;
  userEditedNotes?: StructuredNotes | null;
  source?: 'ai_generated' | 'user_edited';
  version?: number;
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
  sourceId?: string;
  sourceType?: SourceType;
  stage: 'FETCHING' | 'VALIDATING' | 'TRANSCRIBING' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
  progressMessage: string;
  error?: string | null;
}

export interface ValidationCheckResult {
  valid: boolean;
  error?: string;
}

