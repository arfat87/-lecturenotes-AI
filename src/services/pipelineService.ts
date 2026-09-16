import type { Note, ProcessingJob, Recording, Source, Transcript, UserAccount, ValidationCheckResult } from '../types';
import { storageService } from './storageService';
import { transcriptionService } from './transcriptionService';
import { synthesisService } from './synthesisService';
import { linkIngestionService } from './linkIngestionService';

const SUPPORTED_AUDIO_MIMES = [
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/mpeg',
  'audio/mp3'
];

const KNOWN_PLACEHOLDERS = [
  'test',
  'sample transcript',
  'lorem ipsum',
  'demo lecture',
  'sample text',
  'placeholder',
  'test lecture',
  'fake transcript'
];

/**
 * §5 Pre-flight checklist guard: Ensures recording is ready for transcription.
 */
export function canTranscribe(
  recording: Recording | null | undefined,
  audioBlob?: Blob | null,
  currentUser?: UserAccount | null
): ValidationCheckResult {
  if (!recording) {
    return { valid: false, error: 'Recording does not exist in storage.' };
  }

  if (currentUser && recording.userId && recording.userId !== currentUser.userId) {
    return { valid: false, error: 'Recording does not belong to the current user.' };
  }

  const effectiveBlob = audioBlob || recording.audioBlob;
  if (!effectiveBlob || effectiveBlob.size === 0) {
    return { valid: false, error: 'Recording has no audio data (0 bytes). Please record the lecture again.' };
  }

  if (recording.durationSeconds <= 0) {
    return { valid: false, error: 'Recording duration is invalid (0 seconds).' };
  }

  if (recording.durationSeconds > 7200) {
    return { valid: false, error: 'Recording duration exceeds maximum limit of 2 hours.' };
  }

  const mime = (effectiveBlob.type || recording.audioMimeType || '').toLowerCase();
  const isSupportedMime = SUPPORTED_AUDIO_MIMES.some(m => mime.includes(m.replace('audio/', '')));
  if (mime && !isSupportedMime) {
    return { valid: false, error: `Unsupported audio MIME type: ${mime}.` };
  }

  if (recording.status === 'TRANSCRIBING') {
    return { valid: false, error: 'Recording is already being transcribed.' };
  }

  return { valid: true };
}

/**
 * §7 Candidate Transcript Validation Gate:
 * Rejects empty, whitespace-only, or known placeholder fixture strings.
 */
export function validateTranscriptText(
  text?: string | null,
  isDemo: boolean = false
): ValidationCheckResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Transcript is empty. Lecture speech could not be recognized.' };
  }

  const trimmed = text.trim();

  if (!isDemo) {
    const lower = trimmed.toLowerCase();
    const isPlaceholder = KNOWN_PLACEHOLDERS.some(
      ph => lower === ph || lower === `${ph}.` || lower.startsWith(`${ph}:`)
    );
    if (isPlaceholder) {
      return { valid: false, error: 'Transcript failed validation: Text appears to be placeholder or fixture data.' };
    }
  }

  if (trimmed.length < 5) {
    return { valid: false, error: 'Transcript is too short to be a valid lecture recording.' };
  }

  return { valid: true };
}

/**
 * §8 Note-Generation Gate:
 * Confirms transcript is verified, non-empty, and completed before synthesis.
 */
export function canGenerateNote(
  recording: Recording | null | undefined,
  transcript: Transcript | null | undefined,
  activeJobs?: Set<string>
): ValidationCheckResult {
  if (!recording) {
    return { valid: false, error: 'Recording does not exist.' };
  }

  if (activeJobs && activeJobs.has(recording.id)) {
    return { valid: false, error: `A note generation job is already active for recording ${recording.id}.` };
  }

  if (recording.durationSeconds <= 0) {
    return { valid: false, error: 'Recording duration is invalid.' };
  }

  if (!transcript) {
    return { valid: false, error: 'Transcript does not exist.' };
  }

  if (transcript.status !== 'COMPLETED') {
    return { valid: false, error: `Transcript is not COMPLETED (current status: ${transcript.status}).` };
  }

  if (transcript.recordingId !== recording.id) {
    return { valid: false, error: 'Transcript recordingId does not match the current recording.' };
  }

  const textVal = validateTranscriptText(transcript.text, transcript.isDemo || recording.isDemo);
  if (!textVal.valid) {
    return textVal;
  }

  return { valid: true };
}

export class PipelineService {
  private activeJobs: Set<string> = new Set();

  isJobActive(recordingId: string): boolean {
    return this.activeJobs.has(recordingId);
  }

  /**
   * Complete, robust 2-stage pipeline converting a real audio recording into structured notes.
   * Stage 1: Audio -> Speech-to-Text -> Verified & Persisted Transcript
   * Stage 2: Verified Transcript -> Gemini 2.0 Flash Synthesis -> Structured Note
   */
  async createNoteFromRecording(
    recordingId: string,
    onJobUpdate?: (job: ProcessingJob) => void
  ): Promise<Note> {
    // Lock check (§11 granular per-recordingId concurrency lock)
    if (this.activeJobs.has(recordingId)) {
      throw new Error(`A note generation job is already in progress for recording: ${recordingId}`);
    }

    this.activeJobs.add(recordingId);

    const updateJob = (stage: ProcessingJob['stage'], progressMessage: string, error?: string | null) => {
      if (onJobUpdate) {
        onJobUpdate({ recordingId, stage, progressMessage, error });
      }
    };

    try {
      // 1. Verify recording exists & fetch audio
      updateJob('VALIDATING', 'Retrieving and validating recording metadata...');
      const recording = await storageService.getRecording(recordingId);
      if (!recording) {
        throw new Error(`Recording ${recordingId} was not found in storage.`);
      }

      // 2. Return existing note if already completed
      if (recording.noteId) {
        const existingNote = await storageService.getNote(recording.noteId);
        if (existingNote) {
          this.activeJobs.delete(recordingId);
          return existingNote;
        }
      }

      // 3. Pre-flight checklist guard (§5)
      const currentUser = storageService.getUser();
      const preflight = canTranscribe(recording, recording.audioBlob, currentUser);
      if (!preflight.valid) {
        throw new Error(preflight.error || 'Recording failed pre-flight audio validation.');
      }

      const audioBlob = recording.audioBlob!;

      // 4. Check if a valid COMPLETED transcript already exists (e.g. from prior run where Stage 2 failed)
      let transcript: Transcript | null = null;
      if (recording.transcriptId) {
        const existingTranscript = await storageService.getTranscript(recording.transcriptId);
        if (
          existingTranscript &&
          existingTranscript.status === 'COMPLETED' &&
          validateTranscriptText(existingTranscript.text, recording.isDemo).valid
        ) {
          transcript = existingTranscript;
        }
      }

      // 5. Stage 1: Transcription (if not already verified & completed)
      if (!transcript) {
        recording.status = 'TRANSCRIBING';
        recording.errorMessage = null;
        await storageService.saveRecording(recording, audioBlob);

        updateJob('TRANSCRIBING', 'Transcribing spoken lecture audio to verbatim text...');
        const candidate = await transcriptionService.transcribeRecording(
          recording,
          audioBlob,
          (msg) => updateJob('TRANSCRIBING', msg)
        );

        // Run §7 Empty / Invalid Transcript Gate
        const validation = validateTranscriptText(candidate?.text, recording.isDemo);
        if (!validation.valid) {
          // Persist as FAILED transcript to maintain audit trail and prevent orphaned state
          const failedTranscript: Transcript = {
            id: candidate?.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recordingId: recording.id,
            text: candidate?.text || '',
            language: 'en',
            durationSeconds: recording.durationSeconds,
            createdAt: Date.now(),
            status: 'FAILED',
            errorMessage: validation.error,
            isEdited: false,
            originalTextRef: null,
            isDemo: recording.isDemo || false
          };
          await storageService.saveTranscript(failedTranscript);

          recording.status = 'FAILED';
          recording.transcriptId = failedTranscript.id;
          recording.errorMessage = validation.error;
          await storageService.saveRecording(recording, audioBlob);

          throw new Error(validation.error);
        }

        // Candidate passed §7 gate: persist as COMPLETED Transcript BEFORE Stage 2
        transcript = {
          ...candidate,
          status: 'COMPLETED',
          isDemo: recording.isDemo || false,
          isEdited: false,
          originalTextRef: null
        };
        await storageService.saveTranscript(transcript);
        recording.transcriptId = transcript.id;
        await storageService.saveRecording(recording, audioBlob);
      }

      // 6. §8 Note-Generation Gate Check
      const noteGate = canGenerateNote(recording, transcript);
      if (!noteGate.valid) {
        throw new Error(noteGate.error || 'Note generation gate check failed.');
      }

      // 7. Stage 2: Synthesis (strictly takes verified transcript as input)
      recording.status = 'SYNTHESIZING';
      await storageService.saveRecording(recording, audioBlob);
      updateJob('SYNTHESIZING', 'Synthesizing structured study notes, definitions & exam highlights...');

      const structuredNotes = await synthesisService.synthesizeNotes(
        recording,
        transcript,
        (msg) => updateJob('SYNTHESIZING', msg)
      );

      // 8. Format duration and date
      const mins = Math.floor(recording.durationSeconds / 60);
      const formattedDuration = recording.durationSeconds > 0
        ? (mins === 0 ? `${recording.durationSeconds}s` : `${mins} mins`)
        : '45 mins';

      const formattedDate = new Date(recording.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      // 9. Assemble Note with provenance and versioning (§4, §12)
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recordingId: recording.id,
        transcriptId: transcript.id,
        userId: recording.userId,
        subject: recording.subject,
        title: structuredNotes.title || recording.title,
        date: formattedDate,
        durationFormatted: formattedDuration,
        durationSeconds: recording.durationSeconds,
        transcriptText: transcript.text,
        structuredNotes: structuredNotes,
        content: structuredNotes,
        aiOriginalNotes: JSON.parse(JSON.stringify(structuredNotes)),
        userEditedNotes: null,
        source: 'ai_generated',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDemo: recording.isDemo || false
      };

      // 10. Persist Note & mark Recording COMPLETED
      await storageService.saveNote(note);

      recording.status = 'COMPLETED';
      recording.noteId = note.id;
      await storageService.saveRecording(recording, audioBlob);

      updateJob('COMPLETED', 'Notes ready!');
      return note;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during note creation.';

      // Preserve recording state as FAILED without deleting the audio (§9)
      const rec = await storageService.getRecording(recordingId);
      if (rec) {
        rec.status = 'FAILED';
        rec.errorMessage = errorMsg;
        await storageService.saveRecording(rec, rec.audioBlob);
      }

      updateJob('FAILED', 'Failed to generate note.', errorMsg);
      throw new Error(errorMsg);
    } finally {
      this.activeJobs.delete(recordingId);
    }
  }

  /**
   * §12 Regenerates structured notes strictly from the original verified transcript.
   * Never sources from an edited note.
   */
  async regenerateNote(noteId: string): Promise<Note> {
    const note = await storageService.getNote(noteId);
    if (!note) throw new Error(`Note ${noteId} not found.`);

    if (this.activeJobs.has(note.recordingId)) {
      throw new Error('A job is already running for this note.');
    }
    this.activeJobs.add(note.recordingId);

    try {
      const recording = await storageService.getRecording(note.recordingId);
      if (!recording) throw new Error('Source recording not found.');

      const transcript = await storageService.getTranscript(note.transcriptId);
      if (!transcript) throw new Error('Source transcript not found.');

      // Validate source transcript
      const gateCheck = canGenerateNote(recording, transcript);
      if (!gateCheck.valid) {
        throw new Error(gateCheck.error || 'Cannot regenerate note: Source transcript failed validation.');
      }

      // Call Stage 2 synthesis with original transcript
      const freshNotes = await synthesisService.synthesizeNotes(recording, transcript);

      const updatedNote: Note = {
        ...note,
        title: freshNotes.title || note.title,
        structuredNotes: freshNotes,
        content: freshNotes,
        aiOriginalNotes: JSON.parse(JSON.stringify(freshNotes)),
        userEditedNotes: null,
        source: 'ai_generated',
        version: (note.version || 1) + 1,
        updatedAt: Date.now()
      };

      await storageService.saveNote(updatedNote);
      return updatedNote;
    } finally {
      this.activeJobs.delete(note.recordingId);
    }
  }

  /**
   * Retries note creation for a failed recording using its original saved audio or URL source (§9).
   */
  async retryProcessing(sourceId: string, onJobUpdate?: (job: ProcessingJob) => void): Promise<Note> {
    const src = await storageService.getRecording(sourceId);
    if (src && src.sourceUrl) {
      return this.createNoteFromUrl(src.sourceUrl, src.subject, src.title, onJobUpdate);
    }
    return this.createNoteFromRecording(sourceId, onJobUpdate);
  }

  /**
   * Pipeline for creating a note from a URL/link (YouTube, Podcast, Article/Webpage).
   * Path A: Video/Audio Link -> Extract Captions or Audio -> Transcribe if needed -> Verified Transcript -> Stage 2 Synthesis
   * Path B: Article Link -> Fetch & Extract Article Text -> Verified Transcript -> Stage 2 Synthesis
   * Follows the exact same §7 transcript validation gate and §8 note generation gate.
   */
  async createNoteFromUrl(
    url: string,
    subject?: string,
    customTitle?: string,
    onJobUpdate?: (job: ProcessingJob) => void
  ): Promise<Note> {
    // Validate URL syntax and SSRF protection upfront
    const urlValidation = linkIngestionService.validateUrl(url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || 'Invalid or prohibited URL.');
    }

    const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.activeJobs.has(sourceId)) {
      throw new Error(`A processing job is already in progress for source: ${sourceId}`);
    }
    this.activeJobs.add(sourceId);

    const updateJob = (stage: ProcessingJob['stage'], progressMessage: string, error?: string | null) => {
      if (onJobUpdate) {
        onJobUpdate({ recordingId: sourceId, stage, progressMessage, error });
      }
    };

    try {
      updateJob('VALIDATING', 'Analyzing link and verifying safety...');

      const detection = linkIngestionService.detectSourceType(url);
      const detectedType = detection.sourceType;
      const defaultTitle = detectedType === 'URL_ARTICLE' ? 'Web Article' : 'Online Lecture';

      const source: Source = {
        id: sourceId,
        sourceType: detectedType,
        sourceUrl: url,
        userId: storageService.getUser()?.userId || 'usr_101',
        title: customTitle?.trim() || defaultTitle,
        subject: subject?.trim() || 'General',
        durationSeconds: 0,
        createdAt: Date.now(),
        status: 'FETCHING',
        isDemo: false
      };

      await storageService.saveRecording(source);

      // Ingest URL (Path A or Path B)
      updateJob('VALIDATING', 'Fetching and extracting content from link...');
      const ingestResult = await linkIngestionService.ingestUrl(url);

      if (!ingestResult.success) {
        source.status = 'FAILED';
        source.errorMessage = ingestResult.error || 'Failed to ingest URL.';
        await storageService.saveRecording(source);
        updateJob('FAILED', 'Failed to extract content from link.', source.errorMessage);
        throw new Error(source.errorMessage);
      }

      if (ingestResult.title && (!customTitle || customTitle.trim() === '')) {
        source.title = ingestResult.title;
      }
      if (ingestResult.durationSeconds && ingestResult.durationSeconds > 0) {
        source.durationSeconds = ingestResult.durationSeconds;
      }

      let transcript: Transcript | null = null;

      // Handle Path A with extracted audio track
      if (ingestResult.audioBlob) {
        const audioBlob = ingestResult.audioBlob;
        source.audioBlob = audioBlob;
        source.audioMimeType = audioBlob.type || 'audio/webm';
        source.status = 'TRANSCRIBING';
        if (source.durationSeconds <= 0) {
          source.durationSeconds = 60;
        }
        await storageService.saveRecording(source, audioBlob);

        updateJob('TRANSCRIBING', 'Transcribing extracted audio track...');
        const candidate = await transcriptionService.transcribeRecording(
          source,
          audioBlob,
          (msg) => updateJob('TRANSCRIBING', msg)
        );

        const validation = validateTranscriptText(candidate?.text, false);
        if (!validation.valid) {
          const failedTranscript: Transcript = {
            id: candidate?.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recordingId: source.id,
            sourceId: source.id,
            sourceType: source.sourceType,
            sourceUrl: source.sourceUrl,
            text: candidate?.text || '',
            language: 'en',
            durationSeconds: source.durationSeconds,
            createdAt: Date.now(),
            status: 'FAILED',
            errorMessage: validation.error,
            isEdited: false,
            originalTextRef: null,
            isDemo: false
          };
          await storageService.saveTranscript(failedTranscript);

          source.status = 'FAILED';
          source.transcriptId = failedTranscript.id;
          source.errorMessage = validation.error;
          await storageService.saveRecording(source, audioBlob);
          throw new Error(validation.error);
        }

        transcript = {
          ...candidate,
          status: 'COMPLETED',
          recordingId: source.id,
          sourceId: source.id,
          sourceType: source.sourceType,
          sourceUrl: source.sourceUrl,
          isDemo: false,
          isEdited: false,
          originalTextRef: null
        };
        await storageService.saveTranscript(transcript);
        source.transcriptId = transcript.id;
        await storageService.saveRecording(source, audioBlob);
      } else if (ingestResult.transcriptText) {
        // Path A with official captions OR Path B with extracted article text
        const text = ingestResult.transcriptText.trim();
        const validation = validateTranscriptText(text, false);
        if (!validation.valid) {
          const failedTranscript: Transcript = {
            id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recordingId: source.id,
            sourceId: source.id,
            sourceType: source.sourceType,
            sourceUrl: source.sourceUrl,
            text,
            language: 'en',
            durationSeconds: source.durationSeconds,
            createdAt: Date.now(),
            status: 'FAILED',
            errorMessage: validation.error,
            isEdited: false,
            originalTextRef: null,
            isDemo: false
          };
          await storageService.saveTranscript(failedTranscript);

          source.status = 'FAILED';
          source.transcriptId = failedTranscript.id;
          source.errorMessage = validation.error;
          await storageService.saveRecording(source);
          throw new Error(validation.error);
        }

        // Estimate duration if missing (approx 200 words/min = ~0.3 sec/word)
        if (source.durationSeconds <= 0) {
          const words = text.split(/\s+/).filter(Boolean).length;
          source.durationSeconds = Math.max(60, Math.round(words * 0.3));
        }

        transcript = {
          id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          recordingId: source.id,
          sourceId: source.id,
          sourceType: source.sourceType,
          sourceUrl: source.sourceUrl,
          text,
          language: 'en',
          durationSeconds: source.durationSeconds,
          createdAt: Date.now(),
          status: 'COMPLETED',
          isEdited: false,
          originalTextRef: null,
          isDemo: false
        };
        await storageService.saveTranscript(transcript);
        source.transcriptId = transcript.id;
        await storageService.saveRecording(source);
      } else {
        throw new Error('No transcript or audio content could be extracted from link.');
      }

      if (!transcript) {
        throw new Error('Failed to obtain a valid transcript from link.');
      }

      // §8 Note-Generation Gate Check
      const noteGate = canGenerateNote(source, transcript);
      if (!noteGate.valid) {
        throw new Error(noteGate.error || 'Note generation gate check failed.');
      }

      // Stage 2: Synthesis (strictly takes verified transcript as input)
      source.status = 'SYNTHESIZING';
      await storageService.saveRecording(source, source.audioBlob);
      updateJob('SYNTHESIZING', 'Synthesizing structured study notes, definitions & key concepts...');

      const structuredNotes = await synthesisService.synthesizeNotes(
        source,
        transcript,
        (msg) => updateJob('SYNTHESIZING', msg)
      );

      // Assemble formatted duration and date
      const mins = Math.floor(source.durationSeconds / 60);
      const formattedDuration = source.sourceType === 'URL_ARTICLE'
        ? `${mins || 1} min read`
        : (mins === 0 ? `${source.durationSeconds}s` : `${mins} mins`);

      const formattedDate = new Date(source.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      // Assemble Note with provenance and versioning (§4, §12)
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recordingId: source.id,
        transcriptId: transcript.id,
        sourceId: source.id,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        userId: source.userId,
        subject: source.subject,
        title: structuredNotes.title || source.title,
        date: formattedDate,
        durationFormatted: formattedDuration,
        durationSeconds: source.durationSeconds,
        transcriptText: transcript.text,
        structuredNotes: structuredNotes,
        content: structuredNotes,
        aiOriginalNotes: JSON.parse(JSON.stringify(structuredNotes)),
        userEditedNotes: null,
        source: 'ai_generated',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDemo: false
      };

      await storageService.saveNote(note);

      source.status = 'COMPLETED';
      source.noteId = note.id;
      await storageService.saveRecording(source, source.audioBlob);

      updateJob('COMPLETED', 'Notes ready!');
      return note;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during link note creation.';
      const src = await storageService.getRecording(sourceId);
      if (src) {
        src.status = 'FAILED';
        src.errorMessage = errorMsg;
        await storageService.saveRecording(src, src.audioBlob);
      }
      updateJob('FAILED', 'Failed to generate note from link.', errorMsg);
      throw new Error(errorMsg);
    } finally {
      this.activeJobs.delete(sourceId);
    }
  }
}

export const pipelineService = new PipelineService();

